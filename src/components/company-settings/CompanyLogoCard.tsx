// src/components/company-settings/CompanyLogoCard.tsx
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import {
  uploadCompanyLogo,
  removeCompanyLogo,
} from "../../services/companyLogoService";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { MediaPreviewTile } from "../shared/MediaPreviewTile";

interface CompanyLogoCardProps {
  companyId: string;
  initialLogoUrl: string | null;
}

export const CompanyLogoCard: React.FC<CompanyLogoCardProps> = ({
  companyId,
  initialLogoUrl,
}) => {
  const { t } = useTranslation();
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const updatedUrl = await uploadCompanyLogo(companyId, file);
      setLogoUrl(updatedUrl);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t("companySettings.logoUploadError"));
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl) return;

    setErrorMessage(null);
    setIsUploading(true);

    try {
      await removeCompanyLogo(companyId);
      setLogoUrl(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t("companySettings.logoRemoveError"));
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="space-y-6 p-6 shadow-sm">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-text">
              {t("companySettings.companyBrandingTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("companySettings.companyBrandingSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-0 pb-0">
        {errorMessage && (
          <div className="rounded-xl border border-danger-border bg-danger-bg p-3 text-xs font-medium text-danger">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <MediaPreviewTile
            src={logoUrl}
            alt={t("companySettings.companyLogoAlt")}
            emptyLabel={t("companySettings.noLogo")}
          />

          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp, image/svg+xml"
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 rounded-xl px-4"
                icon={<Upload className="h-4 w-4" />}
              >
                {isUploading
                  ? t("companySettings.uploading")
                  : logoUrl
                    ? t("companySettings.changeLogo")
                    : t("companySettings.uploadLogo")}
              </Button>

              {logoUrl && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={isUploading}
                  onClick={handleRemoveLogo}
                  className="gap-2 rounded-xl px-4"
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  {t("companySettings.removeLogo")}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-strong">
              {t("companySettings.supportedFormats")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
