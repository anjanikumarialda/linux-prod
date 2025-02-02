import { Loader2, type LucideIcon } from "lucide-react";

export const Icons = {
  spinner: Loader2,
  microsoft: ({ ...props }: React.ComponentProps<LucideIcon>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 23 23"
      width="23"
      height="23"
      fill="currentColor"
      {...props}
    >
      <path d="M0 0h11v11H0z" />
      <path d="M12 0h11v11H12z" />
      <path d="M0 12h11v11H0z" />
      <path d="M12 12h11v11H12z" />
    </svg>
  ),
}; 