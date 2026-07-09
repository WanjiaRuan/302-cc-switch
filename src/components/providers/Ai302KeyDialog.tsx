import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderIcon } from "@/components/ProviderIcon";
import { AI302_API_KEY_URL } from "@/config/ai302";
import { settingsApi, type AppId } from "@/lib/api";
import type { Provider } from "@/types";

// 302 内置供应商的专属编辑框：接口地址与模型都已预置，
// 用户唯一要做的事就是填 key——所以只给一个 key 输入框。
// 通用编辑（改名、调模型等）走 EditProviderDialog 的完整表单，这里不做。

interface Ai302KeyDialogProps {
  open: boolean;
  provider: Provider | null;
  appId: AppId;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    provider: Provider;
    originalId?: string;
  }) => Promise<void> | void;
}

// key 在各应用配置里的落点与后端种子(AI302_SEEDS)保持一致
function readApiKey(appId: AppId, config: Record<string, unknown>): string {
  if (appId === "codex") {
    const auth = config.auth as Record<string, unknown> | undefined;
    return typeof auth?.OPENAI_API_KEY === "string" ? auth.OPENAI_API_KEY : "";
  }
  const env = config.env as Record<string, unknown> | undefined;
  const field = appId === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  return typeof env?.[field] === "string" ? (env[field] as string) : "";
}

function writeApiKey(
  appId: AppId,
  config: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  if (appId === "codex") {
    const auth = (config.auth ?? {}) as Record<string, unknown>;
    return { ...config, auth: { ...auth, OPENAI_API_KEY: key } };
  }
  const env = (config.env ?? {}) as Record<string, unknown>;
  const field = appId === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  return { ...config, env: { ...env, [field]: key } };
}

export function Ai302KeyDialog({
  open,
  provider,
  appId,
  onOpenChange,
  onSubmit,
}: Ai302KeyDialogProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialKey = useMemo(
    () =>
      provider
        ? readApiKey(appId, provider.settingsConfig as Record<string, unknown>)
        : "",
    [provider?.id, appId, open],
  );

  // 每次打开时回填当前 key，关闭丢弃未保存的输入
  useEffect(() => {
    if (open) {
      setApiKey(initialKey);
    }
  }, [open, initialKey]);

  if (!provider) {
    return null;
  }

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const updated: Provider = {
        ...provider,
        settingsConfig: writeApiKey(
          appId,
          provider.settingsConfig as Record<string, unknown>,
          apiKey.trim(),
        ),
      };
      await onSubmit({ provider: updated, originalId: provider.id });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ProviderIcon icon="ai302" name={provider.name} size={22} />
            {t("ai302.dialogTitle", { defaultValue: "302.AI API Key" })}
          </DialogTitle>
          <DialogDescription>
            {t("ai302.dialogHint", {
              defaultValue:
                "接口地址与模型已预置，模型自动跟随客户端。只需填写你的 302.AI API Key。",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="ai302-api-key">
            {t("ai302.keyLabel", { defaultValue: "API Key" })}
          </Label>
          <Input
            id="ai302-api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          <button
            type="button"
            onClick={() => void settingsApi.openExternal(AI302_API_KEY_URL)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("ai302.getKey", { defaultValue: "没有 Key？去 302.AI 领取" })}
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
