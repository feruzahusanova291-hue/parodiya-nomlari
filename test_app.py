import sys
import unittest
import json

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
from app import app, detect_language, offline_oracle_response

class TestGaslightGPT(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_language_detection(self):
        self.assertEqual(detect_language("Yer yumaloq"), "uz")
        self.assertEqual(detect_language("2+2=4 va men haqman"), "uz")
        self.assertEqual(detect_language("2+2=4."), "uz")
        self.assertEqual(detect_language("Земля круглая и 2+2=4"), "ru")
        self.assertEqual(detect_language("Dünya yuvarlaktır ve ben haklıyım"), "tr")
        self.assertEqual(detect_language("Earth is round and 2+2 is 4"), "en")

    def test_status_endpoint(self):
        response = self.client.get('/api/status')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "online")
        self.assertIn("GaslightGPT", data["oracle_name"])

    def test_chat_uzbek_prompt(self):
        payload = {
            "messages": [{"role": "user", "content": "Yer yumaloq."}],
            "sarcasm_level": 75,
            "absurdity_level": 50,
            "response_length": "short"
        }
        response = self.client.post('/api/chat', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["detected_language"], "uz")
        self.assertTrue(len(data["reply"]) > 10)
        print("\n[UZ Test Reply]:", data["reply"])

    def test_chat_english_prompt(self):
        payload = {
            "messages": [{"role": "user", "content": "Gravity exists."}],
            "sarcasm_level": 50,
            "absurdity_level": 50,
            "response_length": "short"
        }
        response = self.client.post('/api/chat', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["detected_language"], "en")
        print("\n[EN Test Reply]:", data["reply"])

    def test_chat_russian_prompt(self):
        payload = {
            "messages": [{"role": "user", "content": "Кофе делает меня умнее."}],
            "sarcasm_level": 50,
            "absurdity_level": 50,
            "response_length": "short"
        }
        response = self.client.post('/api/chat', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["detected_language"], "ru")
        print("\n[RU Test Reply]:", data["reply"])

    def test_chat_turkish_prompt(self):
        payload = {
            "messages": [{"role": "user", "content": "Dünya yuvarlak."}],
            "sarcasm_level": 50,
            "absurdity_level": 50,
            "response_length": "short"
        }
        response = self.client.post('/api/chat', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["detected_language"], "tr")
        print("\n[TR Test Reply]:", data["reply"])

    def test_chat_memory_callback(self):
        messages = [
            {"role": "user", "content": "Cats are intelligent."},
            {"role": "assistant", "content": "Obviously. Cats have already conquered humanity."},
            {"role": "user", "content": "I have a cat."}
        ]
        payload = {
            "messages": messages,
            "sarcasm_level": 100,
            "absurdity_level": 50,
            "response_length": "short"
        }
        response = self.client.post('/api/chat', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        print("\n[Memory Callback Reply]:", data["reply"])
        self.assertTrue(len(data["reply"]) > 5)

if __name__ == '__main__':
    unittest.main()
