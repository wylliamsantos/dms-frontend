import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCategory, updateCategory } from '@/api/document';
export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => createCategory(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });
}
export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }) => updateCategory(id, payload),
        onSuccess: (data, variables) => {
            const desiredActive = variables?.payload?.active;
            const normalized = {
                ...data,
                active: desiredActive ?? data.active ?? true
            };
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.setQueryData(['categories'], (current) => {
                if (!current) {
                    return current;
                }
                return current.map((category) => (category.id === normalized.id ? normalized : category));
            });
        }
    });
}
