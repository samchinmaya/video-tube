import { Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { subscriptionService } from "../services";
import { Button } from "./ui";

interface Props {
  channelId: string;
  subscribed: boolean;
  onChange?: (subscribed: boolean) => void;
}

export function SubscribeButton({ channelId, subscribed, onChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (user?._id === channelId) return null;

  async function toggle() {
    if (!user) return navigate("/login");
    // Optimistic: flip immediately, roll back if the request fails
    onChange?.(!subscribed);
    setBusy(true);
    try {
      const res = await subscriptionService.toggle(channelId);
      onChange?.(res.subscribed);
    } catch {
      onChange?.(subscribed);
    } finally {
      setBusy(false);
    }
  }

  return subscribed ? (
    <Button onClick={toggle} disabled={busy}>
      <Bell className="size-4" /> Subscribed
    </Button>
  ) : (
    <Button variant="primary" onClick={toggle} disabled={busy}>
      Subscribe
    </Button>
  );
}
