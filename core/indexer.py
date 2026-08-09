import math
import time
import re
from typing import Dict, Any, List, Tuple, Set, Optional

class KnowledgeIndexer:
    """
    Data Recovery & Knowledge Indexing Engine (Auto Self-Index)
    Provides high-performance keyword & vector search and point-in-time state snapshots.
    """
    def __init__(self):
        # Keyword indexing maps a term to a dict of {doc_id: count}
        self.inverted_index: Dict[str, Dict[str, int]] = {}
        # Document contents: {doc_id: raw_text}
        self.documents: Dict[str, str] = {}
        # Vector index: {doc_id: List[float]} (dense vector representation)
        self.vector_index: Dict[str, List[float]] = {}
        # Point-in-time state registry: list of state snapshots (sorted by timestamp)
        # Each snapshot: {"timestamp": float, "session_id": str, "state": dict}
        self.state_snapshots: List[Dict[str, Any]] = []

    def _tokenize(self, text: str) -> List[str]:
        """Utility to tokenize, lowercase, and sanitize text."""
        # Remove non-alphanumeric and split by space
        words = re.findall(r"\w+", text.lower())
        return words

    def index_document(self, doc_id: str, text: str, vector: Optional[List[float]] = None) -> None:
        """
        Indexes document text for keyword search and optionally saves a dense vector representation.
        """
        self.documents[doc_id] = text
        tokens = self._tokenize(text)

        # Build inverted index
        for token in tokens:
            if token not in self.inverted_index:
                self.inverted_index[token] = {}
            self.inverted_index[token][doc_id] = self.inverted_index[token].get(doc_id, 0) + 1

        if vector is not None:
            self.vector_index[doc_id] = vector

    def search_keyword(self, query: str, limit: int = 5) -> List[Tuple[str, float]]:
        """
        Performs high-performance keyword search using TF-IDF style term frequency matching.
        Returns List of (doc_id, score) sorted descending.
        """
        query_tokens = self._tokenize(query)
        scores: Dict[str, float] = {}

        # Simple term-frequency scoring
        for token in query_tokens:
            if token in self.inverted_index:
                postings = self.inverted_index[token]
                # IDF factor: logarithmically penalizes terms that appear in many documents
                num_docs_with_term = len(postings)
                idf = math.log((1 + len(self.documents)) / (1 + num_docs_with_term)) + 1.0

                for doc_id, count in postings.items():
                    # Score contribution = Term Frequency * IDF
                    scores[doc_id] = scores.get(doc_id, 0.0) + (count * idf)

        # Sort results by score descending
        sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        return sorted_scores[:limit]

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """Helper to calculate cosine similarity between two dense vectors."""
        if len(v1) != len(v2) or not v1:
            return 0.0
        dot_product = sum(a * b for a, b in zip(v1, v2))
        norm_a = math.sqrt(sum(a * a for a in v1))
        norm_b = math.sqrt(sum(b * b for b in v2))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot_product / (norm_a * norm_b)

    def search_vector(self, query_vector: List[float], limit: int = 5) -> List[Tuple[str, float]]:
        """
        Performs vector search matching the query vector to indexed document vectors using cosine similarity.
        Returns List of (doc_id, cosine_similarity_score) sorted descending.
        """
        results: List[Tuple[str, float]] = []
        for doc_id, doc_vector in self.vector_index.items():
            sim = self._cosine_similarity(query_vector, doc_vector)
            results.append((doc_id, sim))

        # Sort results by similarity descending
        sorted_results = sorted(results, key=lambda item: item[1], reverse=True)
        return sorted_results[:limit]

    # --- Point-In-Time State Recovery ---

    def register_state_snapshot(self, session_id: str, state_data: Dict[str, Any], timestamp: Optional[float] = None) -> float:
        """
        Saves a state snapshot for point-in-time recovery.
        """
        ts = timestamp if timestamp is not None else time.time()
        snapshot = {
            "timestamp": ts,
            "session_id": session_id,
            "state": state_data.copy()
        }
        self.state_snapshots.append(snapshot)
        # Keep sorted by timestamp
        self.state_snapshots.sort(key=lambda s: s["timestamp"])
        return ts

    def recover_state(self, session_id: str, target_timestamp: float) -> Optional[Dict[str, Any]]:
        """
        Provides point-in-time state recovery.
        Retrieves the state for session_id that is closest to target_timestamp (less than or equal to).
        """
        best_match: Optional[Dict[str, Any]] = None
        for snapshot in self.state_snapshots:
            if snapshot["session_id"] == session_id:
                if snapshot["timestamp"] <= target_timestamp:
                    best_match = snapshot["state"]
                else:
                    # Since snapshots are sorted, any subsequent snapshot will be strictly greater
                    break
        return best_match
