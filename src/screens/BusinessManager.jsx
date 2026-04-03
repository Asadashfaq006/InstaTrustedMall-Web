import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BusinessCard from '@/components/BusinessCard';
import BusinessModal from '@/components/BusinessModal';
import useBusinessStore from '@/stores/businessStore';
import useAuthStore from '@/stores/authStore';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function BusinessManager() {
  const { businesses, activeBusiness, loadAll, loadActive, switchBusiness, deleteBusiness } =
    useBusinessStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editBusiness, setEditBusiness] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isScopedUser = currentUser && currentUser.role !== 'admin';

  useEffect(() => {
    if (isScopedUser && currentUser.id) {
      loadAll(currentUser.id);
    } else {
      loadAll();
    }
    loadActive();
  }, [currentUser?.id]);

  const handleSwitch = async (id) => {
    setSwitchingId(id);
    const start = Date.now();
    const result = await switchBusiness(id, isScopedUser ? currentUser.id : undefined);
    const elapsed = Date.now() - start;
    if (elapsed < 300) {
      await new Promise((r) => setTimeout(r, 300 - elapsed));
    }
    setSwitchingId(null);
    if (result) {
      toast({ title: `Switched to ${result.name}`, variant: 'info' });
    }
  };

  const handleEdit = (business) => {
    setEditBusiness(business);
    setShowEditModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    if (businesses.length <= 1) {
      toast({
        title: 'You must have at least one business profile.',
        variant: 'warning',
      });
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    const success = await deleteBusiness(deleteTarget.id);
    setDeleting(false);
    if (success) {
      toast({
        title: `${deleteTarget.name} has been deleted.`,
        variant: 'destructive',
      });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-text-primary">My Businesses</h1>
        {!isScopedUser && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Business
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {businesses.map((biz) => (
          <BusinessCard
            key={biz.id}
            business={biz}
            isActive={activeBusiness?.id === biz.id}
            onSwitch={handleSwitch}
            onEdit={isScopedUser ? undefined : handleEdit}
            onDelete={isScopedUser ? undefined : (b) => setDeleteTarget(b)}
            switching={switchingId === biz.id}
          />
        ))}

        {/* Add New Card — only for admin */}
        {!isScopedUser && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center transition-all duration-150 hover:border-accent hover:bg-accent-light min-h-[200px]"
          >
            <Plus className="w-9 h-9 text-text-muted" />
            <span className="text-text-secondary font-medium text-sm">Add New Business</span>
          </button>
        )}
      </div>

      {/* Create Modal */}
      <BusinessModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        mode="create"
      />

      {/* Edit Modal */}
      <BusinessModal
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) setEditBusiness(null);
        }}
        mode="edit"
        editData={editBusiness}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-error">Delete Business</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              This will permanently delete <strong>{deleteTarget?.name}</strong> and ALL its products, demands, and buyer records. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
