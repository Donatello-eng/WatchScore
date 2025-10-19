"use client";

type Props = {
  id: number;
  action: (formData: FormData) => void; // server action passed down
};

export default function DeleteWatchForm({ id, action }: Props) {
  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        style={{
          padding: "6px 10px",
          border: "1px solid #e33",
          color: "#e33",
          borderRadius: 6,
        }}
        onClick={(e) => {
          if (!confirm(`Delete watch #${id}? This cannot be undone.`))
            e.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
