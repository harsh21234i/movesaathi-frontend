type AuthFormProps = {
  title: string;
  submitLabel: string;
  onSubmit: (formData: FormData) => Promise<void>;
  includeName?: boolean;
};

export function AuthForm({ title, submitLabel, onSubmit, includeName = false }: AuthFormProps) {
  return (
    <form
      className="panel auth-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(new FormData(event.currentTarget));
      }}
    >
      <h2>{title}</h2>
      {includeName ? <input name="full_name" placeholder="Full name" required /> : null}
      <input name="email" placeholder="Email" type="email" required />
      {includeName ? <input name="phone_number" placeholder="Phone number" /> : null}
      <input name="password" placeholder="Password" type="password" required />
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
