import { Router } from "express";
import supabase from "../utils/db.js";

const test2Router = Router();


test2Router.post('/', async (req, res) => {
    const body = req.body;

    if (Array.isArray(body) && body.length > 0) {
        const extractedData = body[0] || {};
        const lessons = Object.values(extractedData).filter(item => typeof item === "object");
        let lessonIdMap = {};
        let subLessonId = [];
        try {
            const courseId = 94; 
            const insertPromises = lessons.map(async (lesson) => {
                const lessonName = lesson.lessonName;

              
                const { data: lessonData } = await supabase
                    .from("lessons")
                    .insert({ course_id: courseId, lesson_name: lessonName })
                    .select()
                    .order("lesson_id", { ascending: false });

                if (!lessonData || lessonData.length === 0) {
                    throw new Error("Lesson data is null or empty");
                }
                
                const lessonId = lessonData[0].lesson_id;
                lessonIdMap[lessonId] = []; 

              
                if (lesson.subLessonData && Array.isArray(lesson.subLessonData)) {
                    const subLessonInsertPromises = lesson.subLessonData.map(async (subLesson) => {
                        const subLessonName = subLesson.subLessonName;
                        console.log(subLessonName)
                        const { data: subLessonData,error } = await supabase
                            .from("sublessons")
                            .insert([{ lesson_id: lessonId, sublesson_name: subLessonName }])
                            .select("sublesson_id")
                            .order("sublesson_id", { ascending: false });
                        
                        subLessonId.push(subLessonData[0].sublesson_id)
                        let subLessonId1 = subLessonData[0].sublesson_id;
                        lessonIdMap[lessonId].push(subLessonId1); 
                    });

                    await Promise.all(subLessonInsertPromises);
                }
            });

            
            await Promise.all(insertPromises);
            console.log(lessonIdMap)
            console.log(subLessonId)

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
