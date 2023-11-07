import { Router } from "express";
import supabase from "../utils/db.js";

const test2Router = Router();

test2Router.post('/', async (req, res) => {
    const body = req.body;
    const lessonIdMap = {}; 
    if (Array.isArray(body) && body.length > 0) {
        const extractedData = body[0] || {};
        const lessons = Object.values(extractedData).filter(item => typeof item === "object");

        try {
            const courseId = 94; 
           

            const insertPromises = lessons.map(async (lesson) => {
                const lessonName = lesson.lessonName;

                const { data: lessonData } = await supabase
                    .from("lessons")
                    .insert({ course_id: courseId, lesson_name: lessonName })
                    .select()
                    .order("lesson_id", { ascending: false });
                
                const lessonId = lessonData[0].lesson_id;
                lessonIdMap[lessonId] = []; 

                
                if (lesson.subLessonData && Array.isArray(lesson.subLessonData)) {
                    for (const subLesson of lesson.subLessonData) {
                        const subLessonName = subLesson.subLessonName;
                        const { data: subLessonData } = await supabase
                            .from("sublessons")
                            .insert({ lesson_id: lessonId, sublesson_name: subLessonName })
                            .select()
                            .order("sub_lesson_id", { ascending: false });
                        const subLessonId = subLessonData[0].sub_lesson_id;
                        lessonIdMap[lessonId].push(subLessonId); 
                    }
                }
            });
            await Promise.all(insertPromises);
            console.log(lessonIdMap);
            res.json({ success: true, message: "Lessons and sub-lessons inserted successfully" });


        } catch (error) {
            console.error("Error inserting lessons and sub-lessons:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    } else {
        res.status(400).json({ error: "Invalid JSON data" });
    }
});

export default test2Router;
