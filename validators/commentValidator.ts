import * as Yup from "yup";

export const addCommentSchema = Yup.object().shape({
  comment_text: Yup.string()
    .trim()
    .min(1, "comment_text must be at least 1 character long.")
    .max(300, "comment_text cannot be longer than 300 characters.")
    .required("comment_text is required."),
  postId: Yup.number()
    .integer("postId must be an integer")
    .positive("postId must be a positive number")
    .required("postId is required"),
});
