import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import supabase from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Not authenticated" });
  
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", currentUser.id)
      .single();
    
    if (error || !user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
