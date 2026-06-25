export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 w-[calc(100%+3rem)] max-w-none lg:-mx-8 lg:w-[calc(100%+4rem)]">
      {children}
    </div>
  );
}
