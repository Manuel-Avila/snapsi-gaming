import * as Yup from "yup";

export const updateProfileSchema = Yup.object().shape({
  name: Yup.string()
    .min(3, "Name must be at least 3 characters long")
    .max(255, "Name must be at most 255 characters long")
    .required("Name is required"),

  biography: Yup.string()
    .max(500, "Biography must be at most 500 characters long")
    .optional(),
});
