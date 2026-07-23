import React, { useState } from "react";
import { Modal } from "../shared/Modal";
import { Mail, Shield } from "lucide-react";
import type { User as SBUser } from "@supabase/supabase-js";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    email: string;
    full_name: string;
    role: "company_admin" | "regular";
  }) => Promise<SBUser| null>;
  isLoading: boolean;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"company_admin" | "regular">("regular");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await onSubmit({ email, full_name: fullName, role });
      setEmail("");
      setFullName("");
      setRole("regular");
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Invite New Team Member">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 p-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#5e5e62] mb-1">
            Full Name
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="Elena Rivera"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 bg-transparent border border-[#C4C7C5] rounded-xl focus:ring-2 focus:ring-[#4e6700] outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5e5e62] mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5e5e62]" />
            <input
              type="email"
              required
              placeholder="elena.r@chronotrack.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-transparent border border-[#C4C7C5] rounded-xl focus:ring-2 focus:ring-[#4e6700] outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5e5e62] mb-1">
            Access Role
          </label>
          <div className="relative">
            <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5e5e62]" />
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "company_admin" | "regular")
              }
              className="w-full pl-9 pr-3 py-2.5 bg-transparent border border-[#C4C7C5] rounded-xl focus:ring-2 focus:ring-[#4e6700] outline-none text-sm"
            >
              <option value="regular">Regular User</option>
              <option value="company_admin">Company Admin</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-[#C4C7C5]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#C4C7C5] text-[#191c1d] rounded-full font-semibold hover:bg-[#f3f4f5] transition text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{ backgroundColor: "#ABDB11" }}
            className="flex-1 py-2.5 text-[#151f00] rounded-full font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition text-sm disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Invite User"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
