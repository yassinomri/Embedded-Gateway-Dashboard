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
import { BrandLogo, BrandMark } from "@/components/BrandLogo";
import { brand } from "@/lib/brand";
import { Moon, Sun, AlertCircle, Activity, ShieldCheck, Network, Cpu, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [showPassword, setShowPassword] = useState(false);

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
      await login(data.username, data.password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed - please try again");
    }
  };

  const features = [
    { icon: Activity, title: "Live monitoring", text: "CPU, memory, bandwidth and link quality in real time" },
    { icon: Network, title: "Network control", text: "Interfaces, Wi-Fi, DHCP/DNS and connected devices" },
    { icon: ShieldCheck, title: "Firewall & security", text: "Rules, alerts and packet analysis on the device" },
    { icon: Cpu, title: "Built for the edge", text: "Lightweight CGI + C daemons for OpenWrt / prplOS" },
  ];

  const inputClass =
    "h-11 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-500";

  return (
    <div
      className={cn(
        "min-h-screen w-full transition-colors duration-300",
        isDarkMode ? "dark bg-[#0b1219]" : "bg-slate-50"
      )}
    >
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden bg-[#0f1923] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
            aria-hidden="true"
          >
            <defs>
              <pattern id="login-grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M44 0H0V44" fill="none" stroke="#2dd4bf" strokeWidth="0.6" />
                <circle cx="0" cy="0" r="1.6" fill="#2dd4bf" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

          <BrandLogo showTagline className="relative" />

          <div className="relative max-w-md space-y-8">
            <div className="space-y-3">
              <h2 className="text-4xl font-bold leading-tight text-white">
                Your gateway,
                <br />
                <span className="bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
                  under control.
                </span>
              </h2>
              <p className="text-slate-400">
                Configure, monitor and troubleshoot your embedded Linux gateway remotely from one clean interface.
              </p>
            </div>
            <ul className="space-y-4">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/30 bg-brand/10">
                    <Icon className="h-4 w-4 text-brand-300" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-sm text-slate-400">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {brand.author}
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-8 animate-in fade-in-50 duration-500">
            <div className="flex items-center justify-between">
              <BrandMark className="h-11 w-11 lg:invisible" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                className="text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign in
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Log in to manage your gateway.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-200">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="root" autoComplete="username" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600 dark:text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-200">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className={cn(inputClass, "pr-11")}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-600 dark:text-red-400" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="h-11 w-full rounded-lg bg-brand font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-600"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Use the admin credentials configured on your gateway.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
