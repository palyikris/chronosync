import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";
import { deleteFavoriteProject, fetchFavoriteProjects, saveFavoriteProject } from "../services/userPreferencesService";
import type { FavoriteProjectPayload, SavedFavoriteProject } from "../types/user-preferences";

export const useFavoriteProjects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["user-favorite-projects", user?.id];
  const query = useQuery({
    queryKey,
    queryFn: () => fetchFavoriteProjects(user!.id),
    enabled: Boolean(user?.id),
  });
  const save = useMutation({
    mutationFn: ({ payload, id }: { payload: FavoriteProjectPayload; id?: string }) => saveFavoriteProject(payload, id),
    onSuccess: task => {
      queryClient.setQueryData<SavedFavoriteProject[]>(queryKey, current => {
        const items = current ?? [];
        return items.some(item => item.id === task.id)
          ? items.map(item => item.id === task.id ? task : item)
          : [...items, task];
      });
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const remove = useMutation({
    mutationFn: deleteFavoriteProject,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<SavedFavoriteProject[]>(queryKey, current =>
        (current ?? []).filter(item => item.id !== id));
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
    isSaving: save.isPending || remove.isPending,
    save: save.mutateAsync,
    remove: remove.mutateAsync,
  };
};
