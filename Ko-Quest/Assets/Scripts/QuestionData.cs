using System;

[Serializable]
public class QuestionData
{
    public int id;
    public string category;
    public string question;
    public string[] options;
    public int correctAnswer;
}

[Serializable]
public class QuestionList
{
    public QuestionData[] questions;
}
