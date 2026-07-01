import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "tucasa" },
      { name: "description", content: "tucasa" },
    ],
  }),
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-6xl font-bold text-foreground">tucasa</h1>
    </div>
  );
}
