using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class QuizManager : MonoBehaviour
{
    public static QuizManager Instance { get; private set; }

    [Header("Settings")]
    [SerializeField] private int questionsPerGame = 10;

    private List<QuestionData> allQuestions;
    private List<QuestionData> currentGameQuestions;
    private int currentQuestionIndex;
    private int score;
    private int totalAnswered;

    public QuestionData CurrentQuestion => currentGameQuestions[currentQuestionIndex];
    public int Score => score;
    public int TotalAnswered => totalAnswered;
    public int TotalQuestions => currentGameQuestions.Count;
    public bool IsGameOver => currentQuestionIndex >= currentGameQuestions.Count;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        LoadQuestions();
    }

    private void LoadQuestions()
    {
        TextAsset jsonFile = Resources.Load<TextAsset>("questions");
        if (jsonFile == null)
        {
            Debug.LogError("questions.json bulunamadı!");
            return;
        }

        QuestionList questionList = JsonUtility.FromJson<QuestionList>(jsonFile.text);
        allQuestions = questionList.questions.ToList();
        Debug.Log($"{allQuestions.Count} soru yüklendi.");
    }

    public void StartNewGame()
    {
        score = 0;
        totalAnswered = 0;
        currentQuestionIndex = 0;

        // Soruları karıştır ve belirli sayıda seç
        currentGameQuestions = allQuestions
            .OrderBy(q => Random.value)
            .Take(questionsPerGame)
            .ToList();
    }

    /// <summary>
    /// Cevabı kontrol eder. Doğruysa true döner.
    /// </summary>
    public bool SubmitAnswer(int selectedIndex)
    {
        bool isCorrect = selectedIndex == CurrentQuestion.correctAnswer;
        if (isCorrect)
            score++;

        totalAnswered++;
        currentQuestionIndex++;
        return isCorrect;
    }

    public List<string> GetCategories()
    {
        return allQuestions.Select(q => q.category).Distinct().ToList();
    }

    public void StartGameWithCategory(string category)
    {
        score = 0;
        totalAnswered = 0;
        currentQuestionIndex = 0;

        if (category == "Tümü")
        {
            currentGameQuestions = allQuestions
                .OrderBy(q => Random.value)
                .Take(questionsPerGame)
                .ToList();
        }
        else
        {
            currentGameQuestions = allQuestions
                .Where(q => q.category == category)
                .OrderBy(q => Random.value)
                .Take(questionsPerGame)
                .ToList();
        }
    }
}
