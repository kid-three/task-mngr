import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ID } from "node-appwrite";

import { createWorkspaceSchema } from "../schemas";
import { sessionMiddleware } from "@/lib/session-middleware";

import { DATABASE_ID, IMAGES_BUCKET_ID, WORKSPACES_ID } from "@/config";

// import { File } from "buffer";

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const app = new Hono().post(
  "/",
  zValidator("form", createWorkspaceSchema),
  sessionMiddleware,
  async (c) => {
    const databases = c.get("databases");
    const storage = c.get("storage");
    const user = c.get("user");

    const { name, image } = c.req.valid("form");

    console.log("Received image:", image);
    console.log("Type of image:", typeof image);
    console.log("Instance of File:", image instanceof File);

    // if (!(image instanceof File)) {
    //   return c.json({ error: "Input not instance of File" }, 400);
    // }

    let uploadedImageUrl: string | undefined;

    if (image instanceof Blob) {
      const fileExtension = image.type.split("/")[1]; // Get the file extension from the MIME type
      const fileName = `workspace-image-${getRandomInt(
        1,
        100,
      )}.${fileExtension}`;
      const fileImage = new File([image], fileName, { type: image.type });

      const file = await storage.createFile(
        IMAGES_BUCKET_ID,
        ID.unique(),
        fileImage,
      );

      const arrayBuffer = await storage.getFilePreview(
        IMAGES_BUCKET_ID,
        file.$id,
      );

      uploadedImageUrl = `data:image/png;base64,${Buffer.from(
        arrayBuffer,
      ).toString("base64")}`;
    }

    const workspace = await databases.createDocument(
      DATABASE_ID,
      WORKSPACES_ID,
      ID.unique(),
      {
        name,
        userId: user.$id,
        imageUrl: uploadedImageUrl,
      },
    );

    return c.json({ data: workspace });
  },
);

export default app;
