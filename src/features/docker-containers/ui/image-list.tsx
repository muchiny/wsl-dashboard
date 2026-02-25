import { Layers } from "lucide-react";
import type { DockerImage } from "@/shared/types/docker";
import { formatBytes, formatRelativeTime } from "@/shared/lib/formatters";

interface ImageListProps {
  images: DockerImage[];
}

export function ImageList({ images }: ImageListProps) {
  if (images.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-lg border p-6 text-center">
        No images found.
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-b text-left text-xs">
            <th className="px-4 py-2">Repository</th>
            <th className="px-4 py-2">Tag</th>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Size</th>
            <th className="px-4 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {images.map((image) => (
            <tr
              key={`${image.id}-${image.tag}`}
              className="border-border/50 hover:bg-accent/50 border-b"
            >
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Layers className="text-primary h-4 w-4" />
                  {image.repository}
                </div>
              </td>
              <td className="px-4 py-2">
                <span className="border-border rounded border px-1.5 py-0.5 text-xs">
                  {image.tag}
                </span>
              </td>
              <td className="text-muted-foreground px-4 py-2 font-mono text-xs">
                {image.id.slice(0, 12)}
              </td>
              <td className="px-4 py-2 text-xs">{formatBytes(image.size)}</td>
              <td className="text-muted-foreground px-4 py-2 text-xs">
                {formatRelativeTime(image.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
