import * as Yup from "yup";

export const createPostSchema = Yup.object().shape({
  caption: Yup.string().max(
    500,
    "Caption cannot be longer than 500 characters."
  ),
  imageUri: Yup.string().required("Image is required"),
});
