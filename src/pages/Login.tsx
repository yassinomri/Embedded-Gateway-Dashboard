import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useNavigate } from "react-router-dom";
import loginBg from '../assets/login-telnet.png';
import { Moon, Sun, AlertCircle } from "lucide-react"; // Assuming lucide-react for icons
import { cn } from "@/lib/utils"; // Utility for className concatenation (optional, from shadcn/ui)

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Dark mode by default

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      const response = await fetch('http://192.168.1.2/cgi-bin/credentials.cgi?action=login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });

      const text = await response.text();
      console.log("Raw response:", text);
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        setError("Invalid response from server");
        return;
      }
      console.log("Parsed result:", result);

      if (result.success) {
        sessionStorage.setItem('currentCredentials', JSON.stringify({
          username: data.username,
          password: data.password,
        }));
        await login(data.username, data.password);
        window.location.href = "/";
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch (err) {
      setError("Login failed - please try again");
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center bg-gray-900 transition-colors duration-300",
        isDarkMode ? "dark" : ""
      )}
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        className="mx-auto w-full max-w-md space-y-6 rounded-xl border p-8 shadow-2xl transform transition-all duration-500 ease-in-out animate-in fade-in-50"
        style={{
          background: isDarkMode
            ? "rgba(17, 24, 39, 0.70)" // Dark mode: semi-transparent dark
            : "rgba(255, 255, 255, 0.65)", // Light mode: semi-transparent white
          backdropFilter: "blur(10px)",
          borderColor: isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Dark Mode Toggle */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-white" />
            ) : (
              <Moon className="h-5 w-5 text-black" />
            )}
          </Button>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            prplOS Gateway
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Admin Interface
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center rounded-md bg-red-100 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-300 transition-all duration-300">
            <AlertCircle className="h-5 w-5 mr-2 text-black dark:text-white" />
            {error}
          </div>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black dark:text-white">
                    Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="admin"
                      className="border-gray-600 bg-gray-800 text-white dark:text-white focus:ring-2 focus:ring-[#1DA2DA] transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 dark:text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black dark:text-white">
                    Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="border-gray-600 bg-gray-800 text-white dark:text-white focus:ring-2 focus:ring-[#1DA2DA] transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 dark:text-red-400" />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <a
                href="#"
                className="text-sm text-[#1DA2DA] dark:text-[#1DA2DA] hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Forgot Password functionality coming soon!");
                }}
              >
                Forgot Password?
              </a>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#1DA2DA] hover:bg-[#1890c0] text-white font-semibold py-2 rounded-lg transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z"
                    />
                  </svg>
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}