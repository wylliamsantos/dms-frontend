import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCategory, updateCategory } from '@/api/document';
import { CategoryPayload, DocumentCategory } from '@/types/document';

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CategoryPayload) => createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
}

interface UpdateParams {
  id: string;
  payload: CategoryPayload;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateParams) => updateCategory(id, payload),
    onSuccess: (data: DocumentCategory, variables) => {
      const desiredActive = variables?.payload?.active;
      const normalized: DocumentCategory = {
        ...data,
        active: desiredActive ?? data.active ?? true
      };
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.setQueryData<DocumentCategory[] | undefined>(['categories'], (current) => {
        if (!current) {
          return current;
        }
        return current.map((category) => (category.id === normalized.id ? normalized : category));
      });
    }
  });
}
