import { createClient } from "@/lib/supabase/server";
import AddCategoryForm from "./AddCategoryForm";
import { renameCategory, deleteCategory } from "./actions";

export default async function CategoriesAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, sort_order, documents(count)")
    .order("sort_order");
  const categories = data ?? [];

  return (
    <>
      <p className="eyebrow">Repository</p>
      <h1>Categories</h1>
      <p className="muted">
        Group documents consistently. A category can only be deleted when no documents use it.
      </p>

      <div className="admin-grid">
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Documents</th>
                <th><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const docCount = c.documents?.[0]?.count ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <form action={renameCategory} className="inline-form">
                        <input type="hidden" name="id" value={c.id} />
                        <label htmlFor={`name-${c.id}`} className="visually-hidden">
                          Category name
                        </label>
                        <input id={`name-${c.id}`} name="name" defaultValue={c.name} required />
                        <button className="link-button">Save</button>
                      </form>
                    </td>
                    <td>{docCount}</td>
                    <td>
                      {docCount === 0 ? (
                        <form action={deleteCategory}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="link-button">Delete</button>
                        </form>
                      ) : (
                        <span className="muted small">In use</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <AddCategoryForm />
      </div>
    </>
  );
}