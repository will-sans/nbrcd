"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { FaSearch, FaSpinner, FaArrowLeft } from "react-icons/fa";
import { philosophers } from "@/data/philosophers";
import { PostgrestError } from "@supabase/supabase-js";

interface Question {
  id: string;
  philosophy: string;
  author: string;
  question: string;
  learning: string;
  quote: string;
  title: string;
  intro: string;
  call_to_action: string;
  book: string;
  chapter: string;
  category: string;
  similarity?: number;
}

interface FilterOption {
  philosophy?: string;
  book?: string;
  chapter?: string;
  category?: string;
}

interface VectorSearchResult {
  id: string;
  question: string;
  learning: string;
  quote: string;
  category: string;
  book: string;
  chapter: string;
  author: string;
  similarity: number;
  philosophy?: string;
}

export default function LearningSearch() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [author, setAuthor] = useState("");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [category, setCategory] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [useVectorSearch, setUseVectorSearch] = useState(false);

  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const isFetchingRef = useRef(false);
  const itemsPerPage = 10;

  // Mock function to generate embedding
  const generateEmbedding = async (): Promise<number[]> => {
    return Array(1536).fill(0.1); // Dummy vector
  };

  // Fetch filter options based on author, book, and chapter
  const fetchFilterOptions = useCallback(async () => {
    try {
      let bookQuery = supabase.from("questions").select("book");
      let chapterQuery = supabase.from("questions").select("chapter");
      let categoryQuery = supabase.from("questions").select("category");

      if (author) {
        bookQuery = bookQuery.eq("philosophy", author);
        chapterQuery = chapterQuery.eq("philosophy", author);
        categoryQuery = categoryQuery.eq("philosophy", author);
      }

      if (book) {
        chapterQuery = chapterQuery.eq("book", book);
        categoryQuery = categoryQuery.eq("book", book);
      }

      if (chapter) {
        categoryQuery = categoryQuery.eq("chapter", chapter);
      }

      const [bookRes, chapterRes, categoryRes] = await Promise.all([
        bookQuery,
        chapterQuery,
        categoryQuery,
      ]);

      const uniqueBooks = [...new Set(bookRes.data?.map((item: FilterOption) => item.book).filter(Boolean))] as string[];
      const uniqueChapters = [...new Set(chapterRes.data?.map((item: FilterOption) => item.chapter).filter(Boolean))] as string[];
      const uniqueCategories = [...new Set(categoryRes.data?.map((item: FilterOption) => item.category).filter(Boolean))] as string[];

      setBooks(uniqueBooks.sort());
      setChapters(uniqueChapters.sort());
      setCategories(uniqueCategories.sort());
    } catch {
      setError("フィルターオプションの取得に失敗しました。");
    }
  }, [supabase, author, book, chapter]);

  // Fetch total count for pagination
  const fetchTotalCount = useCallback(async () => {
    try {
      let query = supabase.from("questions").select("id", { count: "exact", head: true });

      if (author) query = query.eq("philosophy", author);
      if (book) query = query.eq("book", book);
      if (chapter) query = query.eq("chapter", chapter);
      if (category) query = query.eq("category", category);
      if (searchTerm) query = query.ilike("question", `%${searchTerm}%`);

      const { count, error } = await query;

      if (error) throw error;

      setTotalCount(count);
      console.log("Total count:", count);
    } catch {
      setError("総件数の取得に失敗しました。");
    }
  }, [supabase, author, book, chapter, category, searchTerm]);

  // Fetch questions based on filters
  const fetchQuestions = useCallback(
    async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      setIsLoading(true);
      setError(null);

      console.log("Fetching questions: page=", currentPage, "filters=", { author, book, chapter, category, searchTerm });
      console.log("Query range:", (currentPage - 1) * itemsPerPage, "to", currentPage * itemsPerPage - 1);

      try {
        if (useVectorSearch && searchTerm) {
          const embedding = await generateEmbedding();
          const { data, error } = await supabase
            .rpc("match_questions", {
              query_embedding: embedding,
              match_count: itemsPerPage,
              threshold: 0.8,
            }) as { data: VectorSearchResult[], error: PostgrestError | null };

          if (error) throw error;

          const mappedData = data.map((item: VectorSearchResult) => ({
            id: item.id,
            question: item.question,
            learning: item.learning,
            quote: item.quote,
            category: item.category,
            book: item.book,
            chapter: item.chapter,
            author: item.author,
            similarity: item.similarity,
            philosophy: item.philosophy || item.category,
            title: item.question,
            intro: item.learning,
            call_to_action: item.quote,
          }));

          setQuestions(mappedData);
          console.log("Vector fetched:", mappedData.length, "IDs:", mappedData.map((item) => item.id));
        } else {
          let query = supabase
            .from("questions")
            .select("*")
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)
            .order("id", { ascending: true });

          if (author) query = query.eq("philosophy", author);
          if (book) query = query.eq("book", book);
          if (chapter) query = query.eq("chapter", chapter);
          if (category) query = query.eq("category", category);
          if (searchTerm) query = query.ilike("question", `%${searchTerm}%`);

          const { data, error } = await query;

          if (error) throw error;

          console.log("Fetched data IDs:", data.map((item: Question) => item.id));
          console.log("Fetched questions:", data.map((item: Question) => item.question));
          console.log("Query response length:", data.length);

          setQuestions(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("質問の取得に失敗しました。");
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
      }
    },
    [author, book, chapter, category, searchTerm, useVectorSearch, supabase, currentPage]
  );

  // Combined useEffect to handle filter options, total count, and questions
  useEffect(() => {
    fetchFilterOptions();
    fetchTotalCount();
    fetchQuestions();
  }, [fetchFilterOptions, fetchTotalCount, fetchQuestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchQuestions();
  };

  // Calculate total pages
  const totalPages = totalCount ? Math.ceil(totalCount / itemsPerPage) : 1;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust startPage if endPage is at the max
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push("...");
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last page and ellipsis if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="ホームへ戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold dark:text-gray-100">学び検索</h1>
        <div className="w-12" /> {/* Spacer for alignment */}
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="質問を検索..."
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 mb-3">
          <select
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value);
              setBook("");
              setChapter("");
              setCategory("");
            }}
            className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
          >
            <option value="">著者を選択</option>
            {philosophers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={book}
            onChange={(e) => {
              setBook(e.target.value);
              setChapter("");
              setCategory("");
            }}
            className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            disabled={!author}
          >
            <option value="">書籍を選択</option>
            {books.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={chapter}
            onChange={(e) => {
              setChapter(e.target.value);
              setCategory("");
            }}
            className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            disabled={!author || !book}
          >
            <option value="">章を選択</option>
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            disabled={!author}
          >
            <option value="">カテゴリを選択</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={useVectorSearch}
              onChange={(e) => setUseVectorSearch(e.target.checked)}
              className="mr-2 dark:accent-gray-600"
            />
            セマンティック検索を使用
          </label>
        </div>
        <button
          type="submit"
          className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center text-sm dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          <FaSearch className="mr-2" /> 検索
        </button>
      </form>

      {isLoading && questions.length === 0 ? (
        <div className="text-center">
          <FaSpinner className="animate-spin text-lg dark:text-gray-100" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center text-sm dark:text-red-400">{error}</div>
      ) : questions.length === 0 ? (
        <div className="text-center text-sm dark:text-gray-100">結果が見つかりませんでした。</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="p-3 bg-gray-100 rounded-lg dark:bg-gray-800">
              <h2 className="text-base font-medium dark:text-gray-100">{q.question}</h2>
              <p className="text-gray-600 text-sm dark:text-gray-400">
                {q.author} - {q.book} - {q.chapter}
              </p>
              <p className="text-gray-500 text-xs dark:text-gray-500">{q.category}</p>
              {q.learning && <p className="text-xs mt-1 dark:text-gray-300">{q.learning}</p>}
              {q.quote && (
                <p className="text-xs italic mt-1 dark:text-gray-300">
                  {q.quote}
                </p>
              )}
              {q.similarity && (
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-500">
                  類似度: {(q.similarity * 100).toFixed(2)}%
                </p>
              )}
            </div>
          ))}
          {totalCount !== null && totalCount > itemsPerPage && (
            <div className="flex justify-center mt-6">
              <nav className="flex items-center space-x-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
                    currentPage === 1
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                      : "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                  }`}
                >
                  前へ
                </button>
                {getPageNumbers().map((page, index) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
                        currentPage === page
                          ? "bg-blue-500 text-white dark:bg-blue-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
                    currentPage === totalPages
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                      : "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                  }`}
                >
                  次へ
                </button>
              </nav>
            </div>
          )}
        </div>
      )}
    </div>
  );
}