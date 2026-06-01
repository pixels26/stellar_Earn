import { http, HttpResponse } from 'msw';

// Add the base API url matching your application setup.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const questListResolver = () =>
  HttpResponse.json({
    data: [
      {
        id: 'quest-1',
        title: 'Test Quest 1',
        description: 'This is a test quest',
        rewardAmount: 100,
        rewardAsset: 'XLM',
        status: 'active',
      },
    ],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
    },
  });

const questDetailResolver = ({ params }: { params: { id?: string | readonly string[] } }) => {
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return HttpResponse.json({
    data: {
      id,
      title: `Test Quest ${id}`,
      description: 'Details for test quest',
      rewardAmount: 50,
      rewardAsset: 'XLM',
      status: 'active',
    },
  });
};

export const handlers = [
  // List quests
  http.get(`${API_BASE_URL}/api/v1/quests`, questListResolver),
  http.get('/api/v1/quests', questListResolver),

  // Get single quest
  http.get(`${API_BASE_URL}/api/v1/quests/:id`, questDetailResolver),
  http.get('/api/v1/quests/:id', questDetailResolver),
];
