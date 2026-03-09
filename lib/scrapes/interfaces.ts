export interface IVideoData {
  success: boolean;
  data: {
    title: string;
    id: string;
    image: string;
    duration: string;
    views: string;
    rating: string;
    uploaded: string;
    upvoted: string | null;
    downvoted: string | null;
    models: string[];
    tags: string[];
  };
  assets: string[];
  source: string;
}

export interface ISearchVideoData {
  success: boolean;
  data: Array<{
    link: string;
    id: string | undefined;
    title: string | undefined;
    image: string | undefined;
    duration: string;
    views: string;
    video: string;
  }>;
  source: string;
}

export interface MaybeError {
  success: boolean;
  message: string;
}
