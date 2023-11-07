import { Router } from "express";
import supabase from "../utils/db.js";

function calculateDueDateStatus(assignmentduedate) {
  const dueDate = new Date(assignmentduedate);
  const currentDate = new Date();
  const timeDifference = dueDate - currentDate;
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

  if (daysDifference < 0) {
    return "Overdue";
  } else if (daysDifference < 1) {
    const hoursDifference = Math.floor(
      (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutesDifference = Math.floor(
      (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
    );

    if (hoursDifference > 0) {
      return `${hoursDifference} hour${hoursDifference > 1 ? "s" : ""
        } ${minutesDifference} minute${minutesDifference > 1 ? "s" : ""}`;
    } else {
      return `${minutesDifference} minute${minutesDifference > 1 ? "s" : ""}`;
    }
  } else {
    return `${Math.ceil(daysDifference)} day${daysDifference > 1 ? "s" : ""}`;
  }
}

const assignmentRouter = Router();

assignmentRouter.get("/", async (req, res) => {
  let start = req.query.start - 1;
  let end = req.query.end - 1;
  let search = req.query.search;

  let query = supabase
    .from("assignments")
    .select(
      "*,sublessons(lesson_id,sublesson_name,lessons(*,courses(course_name)))"
    )
    .range(start, end)
    .order("assignment_id", { ascending: false });

  const { count } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .or(
      `assignment_question.ilike.%${search}%`,
      `sublessons.lessons.courses.course_name.ilike.%${search}%`,
      `sublessons.lessons.lesson_name.ilike.%${search}%`,
      `sublessons.sublesson_name.ilike.%${search}%`
    );

  if (search) {
    search = search
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .split(/\s+/) // Split on whitespace
      .map((word) => word.replace(/\s/g, "\\s*"))
      .join(" ");

    query.or(
      `assignment_question.ilike.%${search}%`,
      `sublessons.lessons.courses.course_name.ilike.%${search}%`,
      `sublessons.lessons.lesson_name.ilike.%${search}%`,
      `sublessons.sublesson_name.ilike.%${search}%`
    );
  }
  try {
    const { data, error } = await query;
    if (error) {
      console.log(data, "data");
      res.status(500).json({ error });
    } else {
      const flatData = data;
      flatData.forEach((dataItem) => {
        dataItem.sublesson_name = dataItem.sublessons.sublesson_name;
        dataItem.lesson_name = dataItem.sublessons.lessons.lesson_name;
        dataItem.course_name = dataItem.sublessons.lessons.courses.course_name;
        delete dataItem.sublessons;
      });
      res.json({ flatData, count });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

assignmentRouter.post("/", async (req, res) => {
  const user_id = Number(req.body.user_id);
  const sublesson_id = Number(req.body.sublesson_id);

  const { data: asmData, error: asmError } = await supabase
    .from("assignments")
    .select("assignment_id, duration")
    .eq("sublesson_id", sublesson_id)
    .single();

  if (asmError) {
    throw asmError;
  }

  const { data: checkData, error: checkError } = await supabase
    .from("user_assignments")
    .select()
    .eq("user_id", user_id)
    .eq("assignment_id", asmData.assignment_id);
  if (checkError) {
    throw asmError;
  }
  if (checkData.length === 0) {
    const currentDate = new Date();
    const duedate = new Date(currentDate);
    duedate.setDate(currentDate.getDate() + asmData.duration);

    const data = {
      user_id,
      assignment_id: asmData.assignment_id,
      assignment_duedate: duedate,
    };

    const { error } = await supabase.from("user_assignments").insert(data);
    if (error) {
      throw error;
    }
  }

  return res.json({ message: `assignment has been added.` });
});

assignmentRouter.get("/courseList", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("course_id, course_name");

    if (error) {
      return res.status(404).json({ error });
    }

    const result = [];
    data.map((item) => {
      const newFormat = {};
      newFormat.value = item.course_id;
      newFormat.label = item.course_name;
      result.push(newFormat);
    });

    return res.json({ data: result });
  } catch (err) {
    return res.status(404).json({ err });
  }
});

assignmentRouter.get("/lessonList/", async (req, res) => {
  const course_id = Number(req.query.courseId);
  try {
    const { data, error } = await supabase
      .from("lessons")
      .select("lesson_id, lesson_name")
      .eq("course_id", course_id);

    if (error) {
      return res.status(404).json({ error });
    }

    const result = [];
    data.map((item) => {
      const newFormat = {};
      newFormat.value = item.lesson_id;
      newFormat.label = item.lesson_name;
      result.push(newFormat);
    });

    return res.json({ data: result });
  } catch (err) {
    return res.status(404).json({ err });
  }
});

assignmentRouter.get("/sublessonList/", async (req, res) => {
  const lesson_id = Number(req.query.lessonId);
  try {
    const { data, error } = await supabase
      .from("sublessons")
      .select("sublesson_id, sublesson_name")
      .eq("lesson_id", lesson_id);

    if (error) {
      return res.status(404).json({ error });
    }

    const result = [];
    data.map((item) => {
      const newFormat = {};
      newFormat.value = item.sublesson_id;
      newFormat.label = item.sublesson_name;
      result.push(newFormat);
    });

    return res.json({ data: result });
  } catch (err) {
    return res.status(404).json({ err });
  }
});

assignmentRouter.get("/byId", async (req, res) => {
  const assignment_id = Number(req.query.assignId);
  try {
    const { data, error } = await supabase
      .from("assignments")
      .select(
        "assignment_id, assignment_question ,duration, sublessons(sublesson_name,lessons(lesson_name, courses(course_name)))"
      )
      .eq("assignment_id", assignment_id)
      .single();

    if (error) {
      return res.status(404).json({ error });
    }

    const result = {
      assignment_id: data.assignment_id,
      question: data.assignment_question,
      duration: data.duration,
      course: data.sublessons.lessons.courses.course_name,
      lesson: data.sublessons.lessons.lesson_name,
      sublesson: data.sublessons.sublesson_name,
    };
    return res.json({ data: result });
  } catch (err) {
    return res.status(404).json({ err });
  }
});

assignmentRouter.get("/check", async (req, res) => {
  const sublesson_id = Number(req.query.sublessonId);
  try {
    const { data, error } = await supabase
      .from("assignments")
      .select("assignment_id, assignment_question")
      .eq("sublesson_id", sublesson_id);

    if (error) {
      return res.status(404).json({ error });
    }

    return res.json({ data: data });
  } catch (err) {
    return res.status(404).json({ err });
  }
});

assignmentRouter.get("/:userID", async (req, res) => {
  const userId = req.params.userID;
  const Sublessonid = req.query.sublessonid;

  if (!Sublessonid) {
    const { data, error } = await supabase
      .from("user_assignments")
      .select(
        "*,assignments(sublesson_id,assignment_question,sublessons(lesson_id,sublesson_name,sublesson_video,lessons(*,courses(course_name))))"
      )
      .eq("user_id", `${userId}`)
      .order("assignment_status");
    let flatData = data;

    const flatData2 = flatData.filter(async (dataItem) => {
      if (dataItem.assignment_status === null) {
        return false;
      } else {
        dataItem.sublesson_name =
          dataItem.assignments.sublessons.sublesson_name;
        dataItem.lesson_name =
          dataItem.assignments.sublessons.lessons.lesson_name;
        dataItem.course_name =
          dataItem.assignments.sublessons.lessons.courses.course_name;
        dataItem.assignment_duedate = calculateDueDateStatus(
          dataItem.assignment_duedate
        );
        dataItem.userId = dataItem.user_id;
        dataItem.sublesson_id = dataItem.assignments.sublesson_id;
        dataItem.course_id = dataItem.assignments.sublessons.lessons.course_id;
        delete dataItem.assignments;
        delete dataItem.user_id;
        delete dataItem.user_assignment_id;

        if (
          dataItem.assignment_duedate === "Overdue" &&
          dataItem.assignment_status !== "Submitted late"
        ) {
          const { data: update, error } = await supabase
            .from("user_assignments")
            .update({ assignment_status: "Overdue" })
            .eq("assignment_id", dataItem.assignment_id)
            .select();
        }

        return true;
      }
    });

    res.json({ data: flatData });
  } else {
    const { data, error } = await supabase
      .from("user_assignments")
      .select(
        "*,assignments(sublesson_id,assignment_question,sublessons(lesson_id,sublesson_name,sublesson_video,lessons(*,courses(course_name))))"
      )
      .eq("assignments.sublesson_id", `${Sublessonid}`)
      .eq("user_id", `${userId}`);

    let flatData = data;
    let filteredData;
    if (flatData) {
      filteredData = flatData.filter((item) => item.assignments !== null);
    }

    for (const dataItem of filteredData) {
      dataItem.sublesson_name = dataItem.assignments.sublessons.sublesson_name;
      dataItem.lesson_name =
        dataItem.assignments.sublessons.lessons.lesson_name;
      dataItem.course_name =
        dataItem.assignments.sublessons.lessons.courses.course_name;
      dataItem.assignment_duedate = calculateDueDateStatus(
        dataItem.assignment_duedate
      );
      dataItem.assignment_question = dataItem.assignments.assignment_question;
      dataItem.userId = dataItem.user_id;
      if (!dataItem.assignment_status) {
        dataItem.assignment_status = "Pending";
        const { data, error } = await supabase
          .from("user_assignments")
          .update({ assignment_status: "Pending" })
          .eq("assignment_id", dataItem.assignment_id);
      }
      delete dataItem.assignments;
      delete dataItem.user_id;
      delete dataItem.user_assignment_id;

      if (
        dataItem.assignment_duedate === "Overdue" &&
        dataItem.assignment_status !== "Submitted late"
      ) {
        const { data: update, error } = await supabase
          .from("user_assignments")
          .update({ assignment_status: "Overdue" })
          .eq("assignment_id", dataItem.assignment_id)
          .select();
      }
    }
    res.json({ data: filteredData });
  }

  // res.json({ data:flatData});
});

assignmentRouter.post("/create", async (req, res) => {
  const sublesson_id = Number(req.body.sublessonId);
  const assignment_question = req.body.assignDetail;
  const duration = Number(req.body.duration);

  const created_at = new Date();

  if (!sublesson_id || !assignment_question || !duration) {
    return res.status(400).json({ message: "Invalid request body." });
  }

  const input = { sublesson_id, assignment_question, duration, created_at };

  const { error } = await supabase.from("assignments").insert(input);
  if (error) {
    return res.status(404).json({ error });
  }

  return res.json({ message: "New assignment has been created." });
});

assignmentRouter.put("/edit", async (req, res) => {
  const assignment_id = Number(req.body.assignId);
  const assignment_question = req.body.assignDetail;
  const duration = Number(req.body.duration);

  if (!assignment_id || !assignment_question || !duration) {
    return res.status(400).json({ message: "Invalid request body." });
  }

  const input = { assignment_question, duration };

  const { error } = await supabase
    .from("assignments")
    .update(input)
    .eq("assignment_id", assignment_id);

  if (error) {
    return res.status(404).json({ error });
  }

  return res.json({
    message: `Assignment id:${assignment_id} has been updated.`,
  });
});

assignmentRouter.put("/:userID", async (req, res) => {
  const body = req.body;
  const userId = req.params.userID;
  const assignmentid = req.query.assignmentid;

  if (!Array.isArray(body)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    for (const assignment of body) {
      if (
        assignment &&
        assignment.assignment_status &&
        assignment.assignment_status.trim() === "Overdue" &&
        assignment.assignment_answer &&
        assignment.assignment_answer.trim() !== ""
      ) {
        assignment.assignment_status = "Submitted late";
      } else if (
        assignment &&
        assignment.assignment_answer &&
        assignment.assignment_answer.trim() !== ""
      ) {
        assignment.assignment_status = "Submitted";
      }
    }
    const body2 = body.filter((item) => item.assignment_id == assignmentid);

    if (body2 && body2[0].assignment_id !== undefined) {
      const { data: data1, error: err } = await supabase
        .from("user_assignments")
        .update({ assignment_answer: `${body2[0].assignment_answer}` })
        .eq("assignment_id", body2[0].assignment_id)
        .eq("user_id", userId)
        .select();

      const { data: data2, error: err2 } = await supabase
        .from("user_assignments")
        .update([
          {
            assignment_answer: `${body2[0].assignment_answer}`,
            assignment_status: `${body2[0].assignment_status}`,
          },
        ])
        .eq("assignment_id", body2[0].assignment_id)
        .eq("user_id", userId)
        .select();

      res.json({ data2 });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

assignmentRouter.delete("/:assignment_id", async function (req, res) {
  const assignment_id = req.params.assignment_id;
  try {
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("assignment_id", assignment_id);
    if (error) {
      return res.json({ error: error });
    }
    return res.json({
      message: "delete sublessons id:" + sublessonId + " " + "successfully",
    });
  } catch (error) {
    res.json({ error: error });
  }
});

export default assignmentRouter;
