import type { Message } from "@/lib/types";
import { formatTime } from "@/lib/format";

/** Bitta chat xabari — matn va/yoki rasm. 4 ta chat sahifasidagi bir xil
   render bloki shu bilan almashtirildi. */
export function ChatBubble({
  message,
  mine,
  senderLabel,
}: {
  message: Message;
  mine: boolean;
  senderLabel: string;
}) {
  return (
    <div
      className={`flex max-w-[85%] flex-col gap-1 ${
        mine ? "items-end self-end" : "items-start self-start"
      }`}
    >
      {message.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={message.image}
          alt=""
          className="max-h-56 max-w-full rounded-card border border-line object-cover"
        />
      )}
      {message.text && (
        <div
          className={`whitespace-pre-line break-words rounded-card px-3 py-2 text-sm ${
            mine
              ? "rounded-br-[4px] bg-primary text-on-primary"
              : "rounded-bl-[4px] bg-card-hover text-ink"
          }`}
        >
          {message.text}
        </div>
      )}
      <span className="text-2xs text-faint">
        {senderLabel} · {formatTime(message.createdAt)}
      </span>
    </div>
  );
}
