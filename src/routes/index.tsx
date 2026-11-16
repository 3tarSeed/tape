import { createFileRoute } from "@tanstack/react-router";
import { TapeDesk } from "@/components/tape-desk";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TapeDesk />;
}
