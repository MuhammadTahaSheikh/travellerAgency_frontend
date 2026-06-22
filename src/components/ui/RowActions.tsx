import { Pencil, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface RowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  className?: string;
}

export function RowActions({
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  className,
}: RowActionsProps) {
  if (!canEdit && !canDelete) return null;

  return (
    <div className={clsx('flex items-center justify-end gap-1', className)}>
      {canEdit && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {canDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export async function confirmDelete(label: string): Promise<boolean> {
  return window.confirm(`Are you sure you want to delete ${label}? This action cannot be undone.`);
}
