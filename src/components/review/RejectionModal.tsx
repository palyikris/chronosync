import { AlertCircle } from "lucide-react";
import { Modal } from "../shared/Modal";
import { useTranslation } from "react-i18next";
import { Textarea } from "../shared/Textarea";
import type React from "react";

type RejectionModalProps = {
  isRejectModalOpen: boolean;
  closeRejectModal: () => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  handleConfirmRejection: () => void;
  rejectMutation: {
    isPending: boolean;
  };
  targetRejectId: string | null;
};

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isRejectModalOpen,
  closeRejectModal,
  rejectionReason,
  setRejectionReason,
  handleConfirmRejection,
  rejectMutation,
  targetRejectId,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={isRejectModalOpen}
      onClose={closeRejectModal}
      title={
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span>
            {t("timesheetReview.rejectModalTitle")}
          </span>
        </div>
      }
      className="max-w-md"
    >
      <form
        className="space-y-4 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleConfirmRejection();
        }}
      >
        <p className="text-sm text-muted-strong">
          {t("timesheetReview.rejectModalDescription")}
        </p>

        <Textarea
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder={t("timesheetReview.rejectionReasonPlaceholder")}
          rows={4}
          aria-label={t("timesheetReview.rejectionReasonLabel")}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={closeRejectModal}
            className="px-4 py-2 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            disabled={rejectMutation.isPending}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={
              !rejectionReason.trim() ||
              rejectMutation.isPending ||
              !targetRejectId
            }
            className="px-5 py-2 rounded-full text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rejectMutation.isPending
              ? t("common.saving")
              : t("timesheetReview.confirmRejection")}
          </button>
        </div>
      </form>
    </Modal>
  );
}