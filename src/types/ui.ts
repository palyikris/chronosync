import type React from "react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "./auth";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "dashed";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}


export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface ModalProps {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roleRequired?: UserRole;
}