import { Router } from "express";
import supabase from "../utils/db.js";

const desireRouter = Router();

desireRouter.get("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    let start = req.query.start - 1;
    let end = req.query.end - 1;

    const { data, error } = await supabase
      .from("desire_courses")
      .select(
        `*,courses(course_id,course_name,cover_img,course_detail,total_time,lessons(lesson_id,lesson_name))`
      )
      .eq("user_id", userId)
      .range(start, end);

    const { count } = await supabase
      .from("desire_courses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    res.json({ data, count });
    // res.json(data);
  } catch (error) {
    console.error("Error fetching user course data:", error.message);
    res.status(500).json({ error });
  }
});

desireRouter.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    const courseId = req.query.courseId;

    const data = await supabase
      .from("desire_courses")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId);

    res.json(data);
  } catch (error) {
    console.error("Error fetching user course data:", error.message);
    res.status(500).json({ error });
  }
});

desireRouter.post("/", async (req, res) => {
  try {
    const { user_id, course_id } = req.body;
    const existingDesire = await supabase
      .from("desire_courses")
      .select("*")
      .eq("user_id", user_id)
      .eq("course_id", course_id);

    if (existingDesire.data.length > 0) {
      return res.json({ error: "Desire course already exists." });
    }

    const desireData = { user_id, course_id };
    const { error } = await supabase.from("desire_courses").insert(desireData);

    if (error) {
      throw error;
    }

    res.json({ message: "Desire course has been added." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

desireRouter.delete("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    const courseId = req.query.courseId;

    const { error } = await supabase
      .from("desire_courses")
      .delete()
      .eq("user_id", userId)
      .eq("course_id", courseId);
    if (error) {
      throw error;
    }

    res.json({ message: "desire course has been delete" });
  } catch (error) {
    res.json({ error });
  }
});

export default desireRouter;
