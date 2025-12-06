import { useNavigate, useParams } from 'react-router-dom';

/**
 * Helper hook for navigation with project context
 */
export function useTenderNavigation() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();

  const navigateToTenderDetail = (tenderId: string): void => {
    if (projectId) {
      navigate(`/projects/${projectId}/tenders/${tenderId}`);
    } else {
      navigate(`/tenders/${tenderId}`);
    }
  };

  const navigateToTenderView = (tenderId: string): void => {
    if (projectId) {
      navigate(`/projects/${projectId}/tenders/${tenderId}/view`);
    } else {
      navigate(`/tenders/${tenderId}/view`);
    }
  };

  const navigateToTenderRequirements = (tenderId: string): void => {
    if (projectId) {
      navigate(`/projects/${projectId}/tenders/${tenderId}/requirements`);
    } else {
      navigate(`/tenders/${tenderId}/requirements`);
    }
  };

  return {
    navigateToTenderDetail,
    navigateToTenderView,
    navigateToTenderRequirements,
  };
}
