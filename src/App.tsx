import { HashRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import DataVisualizer from './pages/DataVisualizer'
import Benchmark from './pages/Benchmark'
import { fetchRootDataProto, fetchRootDataJson } from './api/dataClient'
import { DataSourceProvider } from './context/DataSourceContext'

function App() {
  return (
    <DataSourceProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/binary"
            element={<DataVisualizer title="Binary (Protobuf)" fetchFn={fetchRootDataProto} />}
          />
          <Route path="/json" element={<DataVisualizer title="JSON" fetchFn={fetchRootDataJson} />} />
          <Route path="/benchmark" element={<Benchmark />} />
        </Routes>
      </HashRouter>
    </DataSourceProvider>
  )
}

export default App
