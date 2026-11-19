"use client";

import { createContext, useContext, type ReactNode } from "react";

const RecordsTour = createContext<"ATP" | "WTA">("ATP");
const RecordCommentaryContent = createContext<{ path: string; body: ReactNode } | null>(null);

export function useRecordsTour() {
  return useContext(RecordsTour);
}

export function RecordsTourProvider({ tour, children }: { tour: "ATP" | "WTA"; children: ReactNode }) {
  return <RecordsTour.Provider value={tour}>{children}</RecordsTour.Provider>;
}

export function RecordCommentaryProvider({ path, body, children }: { path: string; body: ReactNode; children: ReactNode }) {
  return <RecordCommentaryContent.Provider value={{ path, body }}>{children}</RecordCommentaryContent.Provider>;
}

type CommentaryProps = {
  as?: "article" | "div";
  className: string;
  recordPath?: string;
  children?: ReactNode;
};

export default function RecordCommentary({ as: Tag = "div", className, recordPath, children }: CommentaryProps) {
  const tour = useRecordsTour();
  const commentary = useContext(RecordCommentaryContent);
  const body = tour === "ATP" ? children : commentary?.path === recordPath ? commentary?.body : null;
  if (!body) return null;
  return <Tag className={className} data-record-narrative={recordPath}>{body}</Tag>;
}

export function RecordCommentaryBranch({
  recordPaths, className, children,
}: { recordPaths: readonly string[]; className: string; children: ReactNode }) {
  const tour = useRecordsTour();
  const commentary = useContext(RecordCommentaryContent);
  if (tour === "ATP") return children;
  if (!commentary || !recordPaths.includes(commentary.path)) return null;
  return <RecordCommentary className={className} recordPath={commentary.path} />;
}
