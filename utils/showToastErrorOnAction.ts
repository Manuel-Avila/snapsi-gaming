import Toast from "react-native-toast-message";

export const showToastErrorOnAction = (action: string) => {
  Toast.show({
    type: "error",
    text1: `Error ${action} post`,
    text2: `Failed to ${action} the post. Please try again.`,
  });
};
