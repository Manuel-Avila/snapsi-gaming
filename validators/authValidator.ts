import * as Yup from "yup";

export const registerSchema = Yup.object().shape({
  username: Yup.string()
    .min(5, "Username must be at least 5 characters long")
    .max(50, "Username must be at most 50 characters long")
    .matches(
      /^[a-zA-Z0-9.-]*$/,
      "Username can only contain letters, numbers, hyphens (-), and periods (.)"
    )
    .required("Username is required"),
  name: Yup.string()
    .min(3, "Name must be at least 3 characters long")
    .max(255, "Name must be at most 255 characters long")
    .required("Name is required"),
  email: Yup.string()
    .email("Email is not valid")
    .max(255, "Email must be at most 255 characters long")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters long")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm Password is required"),
  gender: Yup.string()
    .oneOf(["male", "female", "other"], "Gender must be valid")
    .required("Gender is required"),
  age: Yup.number()
    .min(0, "Age cannot be less than 0")
    .max(125, "Age cannot be greater than 125")
    .required("Age is required"),
});

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Email is not valid")
    .max(255, "Email must be at most 255 characters long")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters long")
    .required("Password is required"),
});
