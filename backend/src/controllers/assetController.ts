import { Request, Response } from 'express';
import axios from 'axios';

export const getCityAssets = async (req: Request, res: Response) => {
  try {
    const { location } = req.query;
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const searchName = (location as string).split(',')[0].trim();
    const result: any = { image: null, videos: [] };

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey && unsplashKey !== 'your_unsplash_access_key_here') {
      try {
        const unsplashRes = await axios.get(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchName + ' city architecture landscape')}&per_page=1`,
          { headers: { Authorization: `Client-ID ${unsplashKey}` } }
        );
        if (unsplashRes.data.results.length > 0) {
          result.image = unsplashRes.data.results[0].urls.regular;
        }
      } catch (err: any) {
        console.error('Unsplash API error:', err.response?.data || err.message);
      }
    }

    const youtubeKey = process.env.YOUTUBE_API_KEY;
    if (youtubeKey && youtubeKey !== 'your_youtube_api_key_here') {
      try {
        const youtubeRes = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(searchName + ' travel guide vlog')}&type=video&relevanceLanguage=en&key=${youtubeKey}`
        );
        result.videos = youtubeRes.data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`
        }));
      } catch (err: any) {
        console.error('YouTube API error:', err.response?.data || err.message);
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Asset fetch error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
