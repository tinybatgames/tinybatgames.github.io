using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections;

public class UIManager : MonoBehaviour
{
    [Header("Panels")]
    [SerializeField] private GameObject mainMenuPanel;
    [SerializeField] private GameObject quizPanel;
    [SerializeField] private GameObject resultPanel;
    [SerializeField] private GameObject categoryPanel;

    [Header("Main Menu")]
    [SerializeField] private Button startButton;
    [SerializeField] private Button categoryButton;
    [SerializeField] private Button quitButton;

    [Header("Quiz Panel")]
    [SerializeField] private TextMeshProUGUI questionText;
    [SerializeField] private TextMeshProUGUI categoryText;
    [SerializeField] private TextMeshProUGUI questionCountText;
    [SerializeField] private TextMeshProUGUI scoreText;
    [SerializeField] private Button[] optionButtons;
    [SerializeField] private TextMeshProUGUI[] optionTexts;

    [Header("Result Panel")]
    [SerializeField] private TextMeshProUGUI resultTitleText;
    [SerializeField] private TextMeshProUGUI resultScoreText;
    [SerializeField] private TextMeshProUGUI resultMessageText;
    [SerializeField] private Button restartButton;
    [SerializeField] private Button mainMenuButton;

    [Header("Category Panel")]
    [SerializeField] private Transform categoryButtonContainer;
    [SerializeField] private Button categoryButtonPrefab;
    [SerializeField] private Button categoryBackButton;

    [Header("Colors")]
    [SerializeField] private Color defaultColor = new Color(0.2f, 0.4f, 0.8f);
    [SerializeField] private Color correctColor = new Color(0.2f, 0.8f, 0.2f);
    [SerializeField] private Color wrongColor = new Color(0.8f, 0.2f, 0.2f);

    [Header("Settings")]
    [SerializeField] private float feedbackDelay = 1.2f;

    private bool isProcessing;

    private void Start()
    {
        // Button listeners
        startButton.onClick.AddListener(OnStartGame);
        categoryButton.onClick.AddListener(OnShowCategories);
        quitButton.onClick.AddListener(OnQuit);
        restartButton.onClick.AddListener(OnStartGame);
        mainMenuButton.onClick.AddListener(OnMainMenu);
        categoryBackButton.onClick.AddListener(OnMainMenu);

        for (int i = 0; i < optionButtons.Length; i++)
        {
            int index = i;
            optionButtons[i].onClick.AddListener(() => OnOptionSelected(index));
        }

        ShowMainMenu();
    }

    private void ShowMainMenu()
    {
        mainMenuPanel.SetActive(true);
        quizPanel.SetActive(false);
        resultPanel.SetActive(false);
        categoryPanel.SetActive(false);
    }

    private void OnStartGame()
    {
        QuizManager.Instance.StartNewGame();
        ShowQuizPanel();
    }

    private void OnShowCategories()
    {
        mainMenuPanel.SetActive(false);
        categoryPanel.SetActive(true);

        // Eski butonları temizle
        foreach (Transform child in categoryButtonContainer)
        {
            Destroy(child.gameObject);
        }

        // "Tümü" butonu
        CreateCategoryButton("Tümü");

        // Kategorileri ekle
        foreach (string category in QuizManager.Instance.GetCategories())
        {
            CreateCategoryButton(category);
        }
    }

    private void CreateCategoryButton(string category)
    {
        Button btn = Instantiate(categoryButtonPrefab, categoryButtonContainer);
        btn.gameObject.SetActive(true);
        btn.GetComponentInChildren<TextMeshProUGUI>().text = category;
        btn.onClick.AddListener(() =>
        {
            QuizManager.Instance.StartGameWithCategory(category);
            ShowQuizPanel();
        });
    }

    private void ShowQuizPanel()
    {
        mainMenuPanel.SetActive(false);
        categoryPanel.SetActive(false);
        quizPanel.SetActive(true);
        resultPanel.SetActive(false);
        DisplayQuestion();
    }

    private void DisplayQuestion()
    {
        if (QuizManager.Instance.IsGameOver)
        {
            ShowResult();
            return;
        }

        QuestionData q = QuizManager.Instance.CurrentQuestion;
        questionText.text = q.question;
        categoryText.text = q.category;
        questionCountText.text = $"Soru {QuizManager.Instance.TotalAnswered + 1}/{QuizManager.Instance.TotalQuestions}";
        scoreText.text = $"Skor: {QuizManager.Instance.Score}";

        for (int i = 0; i < optionButtons.Length; i++)
        {
            if (i < q.options.Length)
            {
                optionButtons[i].gameObject.SetActive(true);
                optionTexts[i].text = q.options[i];
                optionButtons[i].image.color = defaultColor;
                optionButtons[i].interactable = true;
            }
            else
            {
                optionButtons[i].gameObject.SetActive(false);
            }
        }
    }

    private void OnOptionSelected(int index)
    {
        if (isProcessing) return;
        StartCoroutine(ProcessAnswer(index));
    }

    private IEnumerator ProcessAnswer(int selectedIndex)
    {
        isProcessing = true;

        // Butonları devre dışı bırak
        foreach (Button btn in optionButtons)
            btn.interactable = false;

        int correctIndex = QuizManager.Instance.CurrentQuestion.correctAnswer;
        bool isCorrect = QuizManager.Instance.SubmitAnswer(selectedIndex);

        // Doğru cevabı yeşil yap
        optionButtons[correctIndex].image.color = correctColor;

        // Yanlış seçildiyse kırmızı yap
        if (!isCorrect)
            optionButtons[selectedIndex].image.color = wrongColor;

        yield return new WaitForSeconds(feedbackDelay);

        isProcessing = false;
        DisplayQuestion();
    }

    private void ShowResult()
    {
        quizPanel.SetActive(false);
        resultPanel.SetActive(true);

        int score = QuizManager.Instance.Score;
        int total = QuizManager.Instance.TotalQuestions;
        float percentage = (float)score / total * 100f;

        resultTitleText.text = "Oyun Bitti!";
        resultScoreText.text = $"{score} / {total}";

        if (percentage >= 90)
            resultMessageText.text = "Muhtesem! Gercek bir Knight Online ustasisin!";
        else if (percentage >= 70)
            resultMessageText.text = "Harika! Knight Online bilgin cok iyi!";
        else if (percentage >= 50)
            resultMessageText.text = "Fena degil! Biraz daha pratik yapabilirsin.";
        else
            resultMessageText.text = "Knight Online dunyasini kesfetmeye devam et!";
    }

    private void OnMainMenu()
    {
        ShowMainMenu();
    }

    private void OnQuit()
    {
#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
#else
        Application.Quit();
#endif
    }
}
