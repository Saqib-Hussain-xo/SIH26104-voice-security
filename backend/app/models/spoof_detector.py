import os
import time
import torch
import torch.nn.functional as F
import numpy as np
from dataclasses import dataclass
from typing import Optional
from huggingface_hub import hf_hub_download
from app.utils.logging import get_logger

logger = get_logger(__name__)

AASIST_CONFIG = {
    "filts": [70, [1, 32], [32, 32], [32, 64], [64, 64]],
    "gat_dims": [64, 32],
    "pool_ratios": [0.5, 0.5, 0.5, 0.5],
    "temperatures": [2.0, 2.0, 100.0, 100.0],
    "first_conv": 3,
}

CUT_LENGTH = 64600
MODEL_ID = "SpeechAntiSpoofingBenchmarks/AASIST"
MODEL_FILENAME = "AASIST.pth"


class SpoofDetectionError(Exception):
    pass


@dataclass
class SpoofDetectionResult:
    model_name: str
    model_version: str
    raw_score: float
    score_type: str
    interpretation: str
    label: str
    inference_time_ms: float
    available: bool
    error: Optional[str] = None


class AASISTModel(torch.nn.Module):
    def __init__(self, d_args):
        super().__init__()
        self.d_args = d_args
        filts = d_args["filts"]
        gat_dims = d_args["gat_dims"]
        pool_ratios = d_args["pool_ratios"]
        temperatures = d_args["temperatures"]

        self.conv_time = CONV(out_channels=filts[0],
                              kernel_size=d_args["first_conv"],
                              in_channels=1)
        self.first_bn = torch.nn.BatchNorm2d(num_features=1)

        self.drop = torch.nn.Dropout(0.5, inplace=True)
        self.drop_way = torch.nn.Dropout(0.2, inplace=True)
        self.selu = torch.nn.SELU(inplace=True)

        self.encoder = torch.nn.Sequential(
            torch.nn.Sequential(Residual_block(nb_filts=filts[1], first=True)),
            torch.nn.Sequential(Residual_block(nb_filts=filts[2])),
            torch.nn.Sequential(Residual_block(nb_filts=filts[3])),
            torch.nn.Sequential(Residual_block(nb_filts=filts[4])),
            torch.nn.Sequential(Residual_block(nb_filts=filts[4])),
            torch.nn.Sequential(Residual_block(nb_filts=filts[4])))

        self.pos_S = torch.nn.Parameter(torch.randn(1, 23, filts[-1][-1]))
        self.master1 = torch.nn.Parameter(torch.randn(1, 1, gat_dims[0]))
        self.master2 = torch.nn.Parameter(torch.randn(1, 1, gat_dims[0]))

        self.GAT_layer_S = GraphAttentionLayer(filts[-1][-1],
                                               gat_dims[0],
                                               temperature=temperatures[0])
        self.GAT_layer_T = GraphAttentionLayer(filts[-1][-1],
                                               gat_dims[0],
                                               temperature=temperatures[1])

        self.HtrgGAT_layer_ST11 = HtrgGraphAttentionLayer(
            gat_dims[0], gat_dims[1], temperature=temperatures[2])
        self.HtrgGAT_layer_ST12 = HtrgGraphAttentionLayer(
            gat_dims[1], gat_dims[1], temperature=temperatures[2])

        self.HtrgGAT_layer_ST21 = HtrgGraphAttentionLayer(
            gat_dims[0], gat_dims[1], temperature=temperatures[2])

        self.HtrgGAT_layer_ST22 = HtrgGraphAttentionLayer(
            gat_dims[1], gat_dims[1], temperature=temperatures[2])

        self.pool_S = GraphPool(pool_ratios[0], gat_dims[0], 0.3)
        self.pool_T = GraphPool(pool_ratios[1], gat_dims[0], 0.3)
        self.pool_hS1 = GraphPool(pool_ratios[2], gat_dims[1], 0.3)
        self.pool_hT1 = GraphPool(pool_ratios[2], gat_dims[1], 0.3)

        self.pool_hS2 = GraphPool(pool_ratios[2], gat_dims[1], 0.3)
        self.pool_hT2 = GraphPool(pool_ratios[2], gat_dims[1], 0.3)

        self.out_layer = torch.nn.Linear(5 * gat_dims[1], 2)

    def forward(self, x, Freq_aug=False):
        x = x.unsqueeze(1)
        x = self.conv_time(x, mask=Freq_aug)
        x = x.unsqueeze(dim=1)
        x = F.max_pool2d(torch.abs(x), (3, 3))
        x = self.first_bn(x)
        x = self.selu(x)

        e = self.encoder(x)

        e_S, _ = torch.max(torch.abs(e), dim=3)
        e_S = e_S.transpose(1, 2) + self.pos_S

        gat_S = self.GAT_layer_S(e_S)
        out_S = self.pool_S(gat_S)

        e_T, _ = torch.max(torch.abs(e), dim=2)
        e_T = e_T.transpose(1, 2)

        gat_T = self.GAT_layer_T(e_T)
        out_T = self.pool_T(gat_T)

        master1 = self.master1.expand(x.size(0), -1, -1)
        master2 = self.master2.expand(x.size(0), -1, -1)

        out_T1, out_S1, master1 = self.HtrgGAT_layer_ST11(
            out_T, out_S, master=self.master1)

        out_S1 = self.pool_hS1(out_S1)
        out_T1 = self.pool_hT1(out_T1)

        out_T_aug, out_S_aug, master_aug = self.HtrgGAT_layer_ST12(
            out_T1, out_S1, master=master1)
        out_T1 = out_T1 + out_T_aug
        out_S1 = out_S1 + out_S_aug
        master1 = master1 + master_aug

        out_T2, out_S2, master2 = self.HtrgGAT_layer_ST21(
            out_T, out_S, master=self.master2)
        out_S2 = self.pool_hS2(out_S2)
        out_T2 = self.pool_hT2(out_T2)

        out_T_aug, out_S_aug, master_aug = self.HtrgGAT_layer_ST22(
            out_T2, out_S2, master=master2)
        out_T2 = out_T2 + out_T_aug
        out_S2 = out_S2 + out_S_aug
        master2 = master2 + master_aug

        out_T1 = self.drop_way(out_T1)
        out_T2 = self.drop_way(out_T2)
        out_S1 = self.drop_way(out_S1)
        out_S2 = self.drop_way(out_S2)
        master1 = self.drop_way(master1)
        master2 = self.drop_way(master2)

        out_T = torch.max(out_T1, out_T2)
        out_S = torch.max(out_S1, out_S2)
        master = torch.max(master1, master2)

        T_max, _ = torch.max(torch.abs(out_T), dim=1)
        T_avg = torch.mean(out_T, dim=1)

        S_max, _ = torch.max(torch.abs(out_S), dim=1)
        S_avg = torch.mean(out_S, dim=1)

        last_hidden = torch.cat(
            [T_max, T_avg, S_max, S_avg, master.squeeze(1)], dim=1)

        last_hidden = self.drop(last_hidden)
        output = self.out_layer(last_hidden)

        return last_hidden, output


class CONV(torch.nn.Module):
    @staticmethod
    def to_mel(hz):
        return 2595 * np.log10(1 + hz / 700)

    @staticmethod
    def to_hz(mel):
        return 700 * (10**(mel / 2595) - 1)

    def __init__(self,
                 out_channels,
                 kernel_size,
                 sample_rate=16000,
                 in_channels=1,
                 stride=1,
                 padding=0,
                 dilation=1,
                 bias=False,
                 groups=1,
                 mask=False):
        super().__init__()
        if in_channels != 1:
            raise ValueError(f"SincConv only support one input channel (here, in_channels = {in_channels})")
        self.out_channels = out_channels
        self.kernel_size = kernel_size
        self.sample_rate = sample_rate

        if kernel_size % 2 == 0:
            self.kernel_size = self.kernel_size + 1
        self.stride = stride
        self.padding = padding
        self.dilation = dilation
        self.mask = mask
        if bias:
            raise ValueError('SincConv does not support bias.')
        if groups > 1:
            raise ValueError('SincConv does not support groups.')

        NFFT = 512
        f = int(self.sample_rate / 2) * np.linspace(0, 1, int(NFFT / 2) + 1)
        fmel = self.to_mel(f)
        fmelmax = np.max(fmel)
        fmelmin = np.min(fmel)
        filbandwidthsmel = np.linspace(fmelmin, fmelmax, self.out_channels + 1)
        filbandwidthsf = self.to_hz(filbandwidthsmel)

        self.mel = filbandwidthsf
        self.hsupp = torch.arange(-(self.kernel_size - 1) / 2,
                                  (self.kernel_size - 1) / 2 + 1)
        self.band_pass = torch.zeros(self.out_channels, self.kernel_size)
        for i in range(len(self.mel) - 1):
            fmin = self.mel[i]
            fmax = self.mel[i + 1]
            hHigh = (2*fmax/self.sample_rate) * \
                np.sinc(2*fmax*self.hsupp/self.sample_rate)
            hLow = (2*fmin/self.sample_rate) * \
                np.sinc(2*fmin*self.hsupp/self.sample_rate)
            hideal = hHigh - hLow

            self.band_pass[i, :] = torch.Tensor(np.hamming(
                self.kernel_size)) * torch.Tensor(hideal)

    def forward(self, x, mask=False):
        band_pass_filter = self.band_pass.clone().to(x.device)
        if mask:
            import random
            A = np.random.uniform(0, 20)
            A = int(A)
            A0 = random.randint(0, band_pass_filter.shape[0] - A)
            band_pass_filter[A0:A0 + A, :] = 0

        self.filters = (band_pass_filter).view(self.out_channels, 1,
                                               self.kernel_size)

        return F.conv1d(x,
                        self.filters,
                        stride=self.stride,
                        padding=self.padding,
                        dilation=self.dilation,
                        bias=None,
                        groups=1)


class Residual_block(torch.nn.Module):
    def __init__(self, nb_filts, first=False):
        super().__init__()
        self.first = first

        if not self.first:
            self.bn1 = torch.nn.BatchNorm2d(num_features=nb_filts[0])
        self.conv1 = torch.nn.Conv2d(in_channels=nb_filts[0],
                               out_channels=nb_filts[1],
                               kernel_size=(2, 3),
                               padding=(1, 1),
                               stride=1)
        self.selu = torch.nn.SELU(inplace=True)

        self.bn2 = torch.nn.BatchNorm2d(num_features=nb_filts[1])
        self.conv2 = torch.nn.Conv2d(in_channels=nb_filts[1],
                               out_channels=nb_filts[1],
                               kernel_size=(2, 3),
                               padding=(0, 1),
                               stride=1)

        if nb_filts[0] != nb_filts[1]:
            self.downsample = True
            self.conv_downsample = torch.nn.Conv2d(in_channels=nb_filts[0],
                                             out_channels=nb_filts[1],
                                             padding=(0, 1),
                                             kernel_size=(1, 3),
                                             stride=1)

        else:
            self.downsample = False
        self.mp = torch.nn.MaxPool2d((1, 3))

    def forward(self, x):
        identity = x
        if not self.first:
            out = self.bn1(x)
            out = self.selu(out)
        else:
            out = x
        out = self.conv1(x)

        out = self.bn2(out)
        out = self.selu(out)
        out = self.conv2(out)

        if self.downsample:
            identity = self.conv_downsample(identity)

        out += identity
        out = self.mp(out)
        return out


class GraphAttentionLayer(torch.nn.Module):
    def __init__(self, in_dim, out_dim, **kwargs):
        super().__init__()

        self.att_proj = torch.nn.Linear(in_dim, out_dim)
        self.att_weight = self._init_new_params(out_dim, 1)

        self.proj_with_att = torch.nn.Linear(in_dim, out_dim)
        self.proj_without_att = torch.nn.Linear(in_dim, out_dim)

        self.bn = torch.nn.BatchNorm1d(out_dim)

        self.input_drop = torch.nn.Dropout(p=0.2)

        self.act = torch.nn.SELU(inplace=True)

        self.temp = 1.
        if "temperature" in kwargs:
            self.temp = kwargs["temperature"]

    def forward(self, x):
        x = self.input_drop(x)

        att_map = self._derive_att_map(x)

        x = self._project(x, att_map)

        x = self._apply_BN(x)
        x = self.act(x)
        return x

    def _pairwise_mul_nodes(self, x):
        nb_nodes = x.size(1)
        x = x.unsqueeze(2).expand(-1, -1, nb_nodes, -1)
        x_mirror = x.transpose(1, 2)

        return x * x_mirror

    def _derive_att_map(self, x):
        att_map = self._pairwise_mul_nodes(x)
        att_map = torch.tanh(self.att_proj(att_map))
        att_map = torch.matmul(att_map, self.att_weight)

        att_map = att_map / self.temp

        att_map = F.softmax(att_map, dim=-2)

        return att_map

    def _project(self, x, att_map):
        x1 = self.proj_with_att(torch.matmul(att_map.squeeze(-1), x))
        x2 = self.proj_without_att(x)

        return x1 + x2

    def _apply_BN(self, x):
        org_size = x.size()
        x = x.view(-1, org_size[-1])
        x = self.bn(x)
        x = x.view(org_size)

        return x

    def _init_new_params(self, *size):
        out = torch.nn.Parameter(torch.FloatTensor(*size))
        torch.nn.init.xavier_normal_(out)
        return out


class HtrgGraphAttentionLayer(torch.nn.Module):
    def __init__(self, in_dim, out_dim, **kwargs):
        super().__init__()

        self.proj_type1 = torch.nn.Linear(in_dim, in_dim)
        self.proj_type2 = torch.nn.Linear(in_dim, in_dim)

        self.att_proj = torch.nn.Linear(in_dim, out_dim)
        self.att_projM = torch.nn.Linear(in_dim, out_dim)

        self.att_weight11 = self._init_new_params(out_dim, 1)
        self.att_weight22 = self._init_new_params(out_dim, 1)
        self.att_weight12 = self._init_new_params(out_dim, 1)
        self.att_weightM = self._init_new_params(out_dim, 1)

        self.proj_with_att = torch.nn.Linear(in_dim, out_dim)
        self.proj_without_att = torch.nn.Linear(in_dim, out_dim)

        self.proj_with_attM = torch.nn.Linear(in_dim, out_dim)
        self.proj_without_attM = torch.nn.Linear(in_dim, out_dim)

        self.bn = torch.nn.BatchNorm1d(out_dim)

        self.input_drop = torch.nn.Dropout(p=0.2)

        self.act = torch.nn.SELU(inplace=True)

        self.temp = 1.
        if "temperature" in kwargs:
            self.temp = kwargs["temperature"]

    def forward(self, x1, x2, master=None):
        num_type1 = x1.size(1)
        num_type2 = x2.size(1)

        x1 = self.proj_type1(x1)
        x2 = self.proj_type2(x2)

        x = torch.cat([x1, x2], dim=1)

        if master is None:
            master = torch.mean(x, dim=1, keepdim=True)

        x = self.input_drop(x)

        att_map = self._derive_att_map(x, num_type1, num_type2)

        master = self._update_master(x, master)

        x = self._project(x, att_map)

        x = self._apply_BN(x)
        x = self.act(x)

        x1 = x.narrow(1, 0, num_type1)
        x2 = x.narrow(1, num_type1, num_type2)

        return x1, x2, master

    def _update_master(self, x, master):

        att_map = self._derive_att_map_master(x, master)
        master = self._project_master(x, master, att_map)

        return master

    def _pairwise_mul_nodes(self, x):
        nb_nodes = x.size(1)
        x = x.unsqueeze(2).expand(-1, -1, nb_nodes, -1)
        x_mirror = x.transpose(1, 2)

        return x * x_mirror

    def _derive_att_map_master(self, x, master):
        att_map = x * master
        att_map = torch.tanh(self.att_projM(att_map))

        att_map = torch.matmul(att_map, self.att_weightM)

        att_map = att_map / self.temp

        att_map = F.softmax(att_map, dim=-2)

        return att_map

    def _derive_att_map(self, x, num_type1, num_type2):
        att_map = self._pairwise_mul_nodes(x)
        att_map = torch.tanh(self.att_proj(att_map))

        att_board = torch.zeros_like(att_map[:, :, :, 0]).unsqueeze(-1)

        att_board[:, :num_type1, :num_type1, :] = torch.matmul(
            att_map[:, :num_type1, :num_type1, :], self.att_weight11)
        att_board[:, num_type1:, num_type1:, :] = torch.matmul(
            att_map[:, num_type1:, num_type1:, :], self.att_weight22)
        att_board[:, :num_type1, num_type1:, :] = torch.matmul(
            att_map[:, :num_type1, num_type1:, :], self.att_weight12)
        att_board[:, num_type1:, :num_type1, :] = torch.matmul(
            att_map[:, num_type1:, :num_type1, :], self.att_weight12)

        att_map = att_board

        att_map = att_map / self.temp

        att_map = F.softmax(att_map, dim=-2)

        return att_map

    def _project(self, x, att_map):
        x1 = self.proj_with_att(torch.matmul(att_map.squeeze(-1), x))
        x2 = self.proj_without_att(x)

        return x1 + x2

    def _project_master(self, x, master, att_map):

        x1 = self.proj_with_attM(torch.matmul(
            att_map.squeeze(-1).unsqueeze(1), x))
        x2 = self.proj_without_attM(master)

        return x1 + x2

    def _apply_BN(self, x):
        org_size = x.size()
        x = x.view(-1, org_size[-1])
        x = self.bn(x)
        x = x.view(org_size)

        return x

    def _init_new_params(self, *size):
        out = torch.nn.Parameter(torch.FloatTensor(*size))
        torch.nn.init.xavier_normal_(out)
        return out


class GraphPool(torch.nn.Module):
    def __init__(self, k: float, in_dim: int, p: float):
        super().__init__()
        self.k = k
        self.sigmoid = torch.nn.Sigmoid()
        self.proj = torch.nn.Linear(in_dim, 1)
        self.drop = torch.nn.Dropout(p=p) if p > 0 else torch.nn.Identity()
        self.in_dim = in_dim

    def forward(self, h):
        Z = self.drop(h)
        weights = self.proj(Z)
        scores = self.sigmoid(weights)
        new_h = self.top_k_graph(scores, h, self.k)

        return new_h

    def top_k_graph(self, scores, h, k):
        _, n_nodes, n_feat = h.size()
        n_nodes = max(int(n_nodes * k), 1)
        _, idx = torch.topk(scores, n_nodes, dim=1)
        idx = idx.expand(-1, -1, n_feat)

        h = h * scores
        h = torch.gather(h, 1, idx)

        return h


class SpoofDetector:
    def __init__(self, model_id: str = MODEL_ID, revision: Optional[str] = None):
        self.model_id = model_id
        self.revision = revision
        self.model: Optional[AASISTModel] = None
        self.is_loaded = False
        self.model_name = "AASIST"
        self.model_version = "ASVspoof2019-LA"
        self.sample_rate = 16000
        self.input_format = "raw waveform, mono, 16kHz, 64600 samples (4.04s)"
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    async def load(self):
        if self.is_loaded:
            return

        logger.info("Loading AASIST model", model_id=self.model_id, device=str(self._device))

        try:
            model_path = hf_hub_download(
                repo_id=self.model_id,
                filename=MODEL_FILENAME,
                revision=self.revision,
            )
            logger.info("Model checkpoint downloaded", path=model_path)

            self.model = AASISTModel(AASIST_CONFIG)
            state_dict = torch.load(model_path, map_location=self._device, weights_only=True)

            if "model" in state_dict:
                state_dict = state_dict["model"]

            self.model.load_state_dict(state_dict, strict=True)
            self.model.to(self._device)
            self.model.eval()

            self.is_loaded = True
            logger.info("AASIST model loaded successfully", device=str(self._device))

        except Exception as e:
            logger.error("Failed to load AASIST model", error=str(e), exc_info=True)
            self.is_loaded = False
            raise SpoofDetectionError(f"Failed to load AASIST model: {str(e)}")

    def _prepare_input(self, waveform: np.ndarray) -> torch.Tensor:
        if waveform.ndim > 1:
            waveform = waveform.mean(axis=0)

        if len(waveform) >= CUT_LENGTH:
            waveform = waveform[:CUT_LENGTH]
        else:
            num_repeats = int(CUT_LENGTH / len(waveform)) + 1
            waveform = np.tile(waveform, num_repeats)[:CUT_LENGTH]

        waveform = waveform.astype(np.float32)
        tensor = torch.from_numpy(waveform).unsqueeze(0).to(self._device)
        return tensor

    async def detect(self, waveform: np.ndarray) -> SpoofDetectionResult:
        if not self.is_loaded or self.model is None:
            return SpoofDetectionResult(
                model_name=self.model_name,
                model_version=self.model_version,
                raw_score=0.0,
                score_type="bona_fide_logit",
                interpretation="Model not loaded",
                label="unknown",
                inference_time_ms=0.0,
                available=False,
                error="Model not loaded",
            )

        start_time = time.perf_counter()

        try:
            input_tensor = self._prepare_input(waveform)

            with torch.no_grad():
                _, output = self.model(input_tensor)

            logits = output.squeeze(0).cpu().numpy()
            spoof_logit = float(logits[0])
            bona_fide_logit = float(logits[1])

            raw_score = bona_fide_logit

            label = "bona_fide" if bona_fide_logit > spoof_logit else "spoof"

            probs = F.softmax(output, dim=1).squeeze(0).cpu().numpy()
            bona_fide_prob = float(probs[1])

            inference_time_ms = (time.perf_counter() - start_time) * 1000

            interpretation = (
                f"Bona fide logit: {bona_fide_logit:.4f}, "
                f"Spoof logit: {spoof_logit:.4f}, "
                f"Bona fide probability (softmax): {bona_fide_prob:.4f}. "
                f"Higher score = more likely genuine human speech. "
                f"Threshold at 0.0 (logit) or ~0.5 (probability) for equal error rate on ASVspoof2019 LA."
            )

            return SpoofDetectionResult(
                model_name=self.model_name,
                model_version=self.model_version,
                raw_score=raw_score,
                score_type="bona_fide_logit",
                interpretation=interpretation,
                label=label,
                inference_time_ms=round(inference_time_ms, 2),
                available=True,
                error=None,
            )

        except Exception as e:
            logger.error("Spoof detection inference failed", error=str(e), exc_info=True)
            inference_time_ms = (time.perf_counter() - start_time) * 1000
            return SpoofDetectionResult(
                model_name=self.model_name,
                model_version=self.model_version,
                raw_score=0.0,
                score_type="bona_fide_logit",
                interpretation="Inference failed",
                label="error",
                inference_time_ms=round(inference_time_ms, 2),
                available=False,
                error=str(e),
            )