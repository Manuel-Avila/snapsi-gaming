import CustomTextInput from "@/components/ui/CustomTextInput";
import DropdownInput from "@/components/ui/DropdownInput";
import PulsateButton from "@/components/ui/PulsateButton";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { registerSchema } from "@/validators/authValidator";
import { AxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useMutation } from "react-query";

type ErrorResponse = {
  message: string;
};

export default function Register() {
  const { register } = useAuth();
  const { submitForm, isSubmitting, errors } = useFormSubmit();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const genderOptions = ["Male", "Female", "Other"];

  const { mutate, isLoading } = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      Toast.show({
        type: "success",
        text1: "Registration Successful!",
        text2: "You can now log in with your credentials.",
      });

      router.push("/(auth)/login");
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      const errorMessage =
        error.response?.data?.message ||
        "An error occurred during registration. Please try again later.";

      Toast.show({
        type: "error",
        text1: "Registration Error",
        text2: errorMessage,
      });
    },
  });

  const handleSubmit = async () => {
    Keyboard.dismiss();

    const formData = {
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      password: password,
      confirmPassword: confirmPassword,
      age: age === "" ? null : Number(age),
      gender: gender.toLowerCase(),
    };

    await submitForm(formData, registerSchema, mutate);
  };

  return (
    <KeyboardAvoidingView
      style={styles.scrollContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? -15 : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Ionicons name="game-controller" size={80} color={COLORS.primary} />
        <Text style={styles.title}>Sign Up</Text>
        <View style={styles.inputContainer}>
          <CustomTextInput
            label="Name"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />
          <CustomTextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
          />
          <CustomTextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />
          <View style={styles.ageAndGenderContainer}>
            <DropdownInput
              label="Gender"
              value={gender}
              onSelect={setGender}
              options={genderOptions}
              style={styles.flex}
              error={errors.gender}
            />
            <CustomTextInput
              label="Age"
              value={age}
              onChangeText={setAge}
              style={styles.flex}
              keyboardType="number-pad"
              maxLength={3}
              error={errors.age}
            />
          </View>
          <CustomTextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            error={errors.password}
          />
          <CustomTextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={true}
            error={errors.confirmPassword}
          />
        </View>
        <PulsateButton
          onPress={handleSubmit}
          disabled={isSubmitting || isLoading}
          style={styles.button}
        >
          <Text style={styles.text}>Sign Up</Text>
        </PulsateButton>
        <View style={styles.separatorContainer}>
          <View style={styles.separator} />
          <Text style={styles.text}>Or</Text>
          <View style={styles.separator} />
        </View>

        <Text style={styles.text}>
          Already have an account?
          <Link href="/(auth)/login" style={styles.link}>
            {" "}
            Log In
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    backgroundColor: COLORS.background,
    paddingVertical: 70,
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: COLORS.text,
  },
  inputContainer: {
    width: "80%",
    gap: 20,
  },
  button: {
    marginTop: 20,
    padding: 12,
    width: "75%",
    maxWidth: 500,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
  },
  text: {
    color: COLORS.text,
    textAlign: "center",
  },
  ageAndGenderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    zIndex: 10,
  },
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    gap: 10,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.text,
    flex: 1,
  },
  link: {
    color: COLORS.primary,
  },
});
