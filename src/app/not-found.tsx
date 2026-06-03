import ErrorPage from '@/components/common/ErrorPage';

export default function NotFound() {
  return (
    <ErrorPage
      title="Page not found"
      message="The page you're looking for doesn't exist."
      showHome
    />
  );
}
