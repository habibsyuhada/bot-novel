import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "../../lib/db";

type Novel = {
  id: number;
  name: string;
  last_url_translated: string | null;
};

type NovelResponse = {
  success: boolean;
  message: string;
  data?: Novel[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NovelResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      error: "Only GET requests are allowed",
    });
  }

  try {
    const result = await pool.query<Novel>(
      `select id, name, last_url_translated
       from novel
       order by id asc`
    );

    return res.status(200).json({
      success: true,
      message: "Successfully fetched novels",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching novels:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching novels",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
