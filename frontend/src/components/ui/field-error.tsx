export function FieldError({ message }: { message?: string }) {
  return (
    <>
      {message && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {message}
        </p>
      )}
    </>
  );
}
