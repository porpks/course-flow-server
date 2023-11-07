import { Router } from "express";
import supabase from "../utils/db.js";

const courseRouter = Router();

courseRouter.get("/", async (req, res) => {
  try {
    let start = req.query.start - 1;
    let desc = req.query.desc;
    let course = req.query.course;
    let end = req.query.end - 1;

    const query = supabase
      .from("courses")
      .select("*,lessons(*,sublessons(*))")
      .order("course_id", { ascending: desc });

    const { count } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .ilike("course_name", `%${course}%`);


    if (course) {
      query.ilike("course_name", `%${course}%`);
    }

    query.range(start, end);

    const { data, error } = await query;

    return res.json({
      data,
      count,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Get course error message ${error.message}` });
  }
});

courseRouter.get("/course", async (req, res) => {
  try {
    let keywords = req.query.keywords;
    let start = req.query.start - 1;
    let end = req.query.end - 1;

    if (keywords === undefined) {
      return res.status(400).json({
        message: "Please send keywords parameter in the URL endpoint",
      });
    }

    const regexKeywords = keywords
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .split(/\s+/) // Split on whitespace
      .map((word) => word.replace(/\s/g, "\\s*"))
      .join(" ");

    const queryFullName = `course_name.ilike.${keywords}`;
    const queryKeywords = `course_name.ilike.%${regexKeywords}%`;

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .or(`${queryFullName},${queryKeywords}`)
      .order("course_id", { ascending: true })
      .range(start, end);

    const { count } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .or(`${queryFullName},${queryKeywords}`);

    return res.json({
      data: data,
      count,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "An error occurred while fetching data from Supabase",
      error: error.message,
    });
  }
});

courseRouter.get("/:courseId", async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { data, error } = await supabase
      .from("courses")
      .select("*,lessons(*,sublessons(sublesson_name,sublesson_id))")
      .eq("course_id", courseId);

    if (error) {
      throw error;
    }

    return res.json({
      data: data[0],
    });
  } catch (error) {
    message: error;
  }
});

courseRouter.post("/:courseId", async (req, res) => {
  const lessonData = { lesson_name: req.body.lesson_name };
  // try {
  //   const courseId = req.params.courseId
  //   const { data, error } = await supabase
  //     .from('courses')
  //     .select('*,lessons(*,sublessons(sublesson_name,sublesson_id))')
  //     .eq('course_id', courseId)

  //   if (error) {
  //     throw error
  //   }

  //   return res.json({
  //     data: data[0],
  //   })
  // } catch (error) {
  //   message: error
  // }
});

courseRouter.delete("/:courseId", async (req, res) => {
  const courseId = req.params.courseId;

  try {
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("course_id", courseId);
    return res.json({
      message: "course has been delete",
    });
  } catch (error) {
    return res.status(400).json({
      message: error,
    });
  }
});

courseRouter.put("/:courseId", async (req, res) => {
  const courseId = req.params.courseId;
  const lessonData = { lesson_name: req.body.lesson_name };

  // if (
  //   !req.body.course_name ||
  //   !req.body.price ||
  //   !req.body.total_time ||
  //   !req.body.course_summary ||
  //   !req.body.course_detail
  // ) {
  //   return res.status(400).json({
  //     message: 'Please enter all information.',
  //   })
  // }

  console.log(req.body);
  try {
    const { data, error } = await supabase
      .from("courses")
      .update({
        course_name: req.body.course_name,
        price: req.body.price,
        total_time: req.body.total_time,
        course_summary: req.body.course_summary,
        course_detail: req.body.course_detail,
        // image_url: imgUrl,
        // updated_at: formattedDate1,
      })
      .eq("course_id", courseId);
    if (error) {
      console.log(error);
    }
  } catch (error) {
    console.error(error);
  }
  // try {
  //   const courseId = req.params.courseId
  //   const { data, error } = await supabase
  //     .from('courses')
  //     .select('*,lessons(*,sublessons(sublesson_name,sublesson_id))')
  //     .eq('course_id', courseId)

  //   if (error) {
  //     throw error
  //   }

  return res.json({
    message: "You Course has been update",
  });
  // } catch (error) {
  //   message: error
  // }
});

export default courseRouter;
