import { useState } from "react";
// import { useNavigate } from "react-router-dom"; // Remove if not available
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

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate(); // Remove if react-router-dom not available
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

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
        console.log("Login success, about to call useAuth().login");
        sessionStorage.setItem('currentCredentials', JSON.stringify({
          username: data.username,
          password: data.password,
        }));
        await login(data.username, data.password);
        console.log("Called login, redirecting...");
        window.location.href = "/";
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch (err) {
      setError("Login failed - please try again");
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">prplOS Gateway</h1>
          <p className="text-muted-foreground">Admin Interface</p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}