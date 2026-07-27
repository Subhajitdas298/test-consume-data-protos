import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import DataVisualizer from './pages/DataVisualizer'
import { fetchRootDataProto, fetchRootDataJson } from './api/dataClient'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/binary"
          element={<DataVisualizer title="Binary (Protobuf)" fetcher={fetchRootDataProto} />}
        />
        <Route path="/json" element={<DataVisualizer title="JSON" fetcher={fetchRootDataJson} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
